fn save_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
  tauri::plugin::Builder::new("save")
    .setup(|_app, api| {
      #[cfg(target_os = "android")]
      api.register_android_plugin("com.candlestickers.dev", "SavePlugin")?;
      Ok(())
    })
    .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(save_plugin())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
