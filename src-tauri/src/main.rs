#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{AppHandle, Manager, RunEvent, State, WebviewUrl};
use tauri_plugin_fs::init as fs_init;
use uuid::Uuid;

// ------- Shared per-window pending files -------
struct PendingFiles(Mutex<HashMap<String, String>>);

// Helper: convert tauri::Url -> OS file path string
fn url_to_path(u: &tauri::Url) -> Option<String> {
    if u.scheme() == "file" {
        u.to_file_path()
            .ok()
            .and_then(|p| p.to_str().map(|s| s.to_string()))
    } else {
        // fallback: if it’s already a path-like string
        Some(u.to_string())
    }
}

// ------- Commands --------

// Each window calls this on boot to “take” its pending file (if any)
#[tauri::command]
fn take_pending_file(window: tauri::Window, pending: State<PendingFiles>) -> Option<String> {
    let label = window.label().to_string();
    pending.0.lock().unwrap().remove(&label)
}

// Optional: main window signals it's ready (noop but handy for logs)
#[tauri::command]
fn frontend_ready(_window: tauri::Window) -> Result<(), String> {
    println!("frontend_ready from {}", _window.label());
    Ok(())
}

// FFMPEG for MP4 exporter
use std::{fs, process::Command};
use serde::Deserialize;

#[derive(Deserialize)]
struct Frame {
    name: String,
    data: Vec<u8>,
}

#[tauri::command]
async fn render_video_ffmpeg(
    frames: Vec<Frame>,
    audio: Option<Vec<u8>>,
    fps: f32,
    _width: u32,
    _height: u32,
    name: String,
) -> Result<(), String> {

    let temp_dir = std::env::temp_dir().join("candlestick_render");
    let _ = fs::remove_dir_all(&temp_dir);
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    // Write frame images
    for frame in frames {
        fs::write(
            temp_dir.join(frame.name),
            frame.data
        ).map_err(|e| e.to_string())?;
    }

    // Write audio if exists
    let has_audio = audio.is_some();
    if let Some(ref audio_data) = audio {
        fs::write(
            temp_dir.join("audio.wav"),
            audio_data
        ).map_err(|e| e.to_string())?;
    }

    // Sanitize the user-supplied output name to prevent path traversal / injection
    // via special characters (e.g. "../", "/", null bytes) ending up in file paths
    // or command arguments.
    let safe_name: String = name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let safe_name = if safe_name.is_empty() { "output".to_string() } else { safe_name };

    let output_path = temp_dir.join(format!("{}.mp4", safe_name));

    let mut cmd = Command::new("ffmpeg");
    cmd.current_dir(&temp_dir)
        .args([
            "-y",
            "-r", &fps.to_string(),
            "-i", "frame%12d.jpg",
        ]);

    if has_audio {
        cmd.args(["-i", "audio.wav"]);
    }

    cmd.args([
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "18",
    ]);

    if has_audio {
        cmd.args(["-c:a", "aac", "-shortest"]);
    }

    cmd.arg(&output_path);

    let status = cmd.status().map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("ffmpeg failed to render video".into());
    }

    // Open file automatically for user
    #[cfg(target_os = "macos")]
    Command::new("open").arg(&output_path).spawn().ok();

    #[cfg(target_os = "windows")]
    Command::new("explorer").arg(&output_path).spawn().ok();

    #[cfg(target_os = "linux")]
    Command::new("xdg-open").arg(&output_path).spawn().ok();

    Ok(())
}


// ------- Main Builder --------
fn main() {

    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE","1");
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER","1");
    std::env::set_var("GSK_RENDERER","gl");
    std::env::set_var("LIBGL_ALWAYS_SOFTWARE","1");
    std::env::set_var("MESA_GL_VERSION_OVERRIDE","3.2");
    std::env::set_var("MESA_GLSL_VERSION_OVERRIDE","150");
    

    #[cfg(target_os = "linux")]
    {
        // Disable GPU compositing (fixes EGL_BAD_PARAMETER)
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

        // Force software GL
        std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "1");

        // Ensure X11 is preferred (Wayland breaks WebKit on some AMD systems)
        std::env::set_var("WINIT_UNIX_BACKEND", "x11");

        // Helps Steam Deck / Arch KDE
        std::env::set_var("MOZ_ENABLE_WAYLAND", "0");
    }

    
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(fs_init())
        .manage(PendingFiles(Mutex::new(HashMap::new())))
        .setup(|app| {
            // Handle files passed on app launch (cold start)
            if let Some(arg) = std::env::args().nth(1) {
                let pending = app.state::<PendingFiles>();
                pending.0.lock().unwrap().insert("main".into(), arg);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            frontend_ready,
            take_pending_file,
            render_video_ffmpeg,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // --- macOS: Handles "Open With" events ---
            #[cfg(target_os = "macos")]
            if let RunEvent::Opened { urls, .. } = event {
                for url in urls {
                    if let Some(path) = url_to_path(&url) {
                        handle_file_open(app_handle, path);
                    }
                }
            }

            // --- Windows / Linux: process pending file on startup ---
            #[cfg(not(target_os = "macos"))]
            if let RunEvent::Ready = event {
                // Windows/Linux: handle startup arg file here if passed
                let path_opt = {
                    let pending = app_handle.state::<PendingFiles>();
                    let mut guard = pending.0.lock().unwrap();
                    guard.remove("main")
                };

                if let Some(path) = path_opt {
                    handle_file_open(app_handle, path);
                }

            }
        });
}

// ------- File Open Logic (shared) -------
fn handle_file_open(app_handle: &AppHandle, path: String) {
    if app_handle.webview_windows().is_empty() {
        let pending = app_handle.state::<PendingFiles>();
        pending.0.lock().unwrap().insert("main".into(), path);
    } else {
        let label = format!("editor-{}", Uuid::new_v4());
        let title = format!(
            "CS — {}",
            std::path::Path::new(&path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Project")
        );

        let _ = tauri::WebviewWindowBuilder::new(
            app_handle,
            label.clone(),
            WebviewUrl::App("index.html".into()),
        )
        .title(title)
        .inner_size(1200.0, 800.0)
        .min_inner_size(900.0, 600.0)
        .build();

        let pending = app_handle.state::<PendingFiles>();
        pending.0.lock().unwrap().insert(label, path);
    }
}
