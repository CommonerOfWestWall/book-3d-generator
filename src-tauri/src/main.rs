#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::Engine;

#[tauri::command]
fn save_image_file(file_path: String, base64_data: String) -> Result<(), String> {
    let encoded = base64_data
        .split_once(',')
        .map(|(_, data)| data)
        .unwrap_or(base64_data.as_str());
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|err| err.to_string())?;
    std::fs::write(file_path, bytes).map_err(|err| err.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_image_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
