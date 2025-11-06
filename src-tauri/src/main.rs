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

// Build the app
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(fs_init())
        .manage(PendingFiles(Mutex::new(HashMap::new())))
        .setup(|app| {
            // If app launched by double-clicking a file (cold start),
            // stash it for the *main* window (label: "main").
            if let Some(arg) = std::env::args().nth(1) {
                // no need to specify format -H.A.
                // if arg.ends_with(".wick") || arg.ends_with(".wickobj") || arg.ends_with(".wickobj") {
                    let pending = app.state::<PendingFiles>();
                    pending.0.lock().unwrap().insert("main".into(), arg);
                // 
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![frontend_ready, take_pending_file])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Opened { urls, .. } = event {
                for url in urls {
                    if let Some(path) = url_to_path(&url) {
                        // If app is still launching (no windows yet), store for main window
                        if app_handle.webview_windows().is_empty() {
                            let pending = app_handle.state::<PendingFiles>();
                            pending.0.lock().unwrap().insert("main".into(), path);
                        } else {
                            // App already open → spawn new window (same logic as before)
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
                }
            }
        });
}
