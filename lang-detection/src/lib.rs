mod utils;

use lingua::LanguageDetectorBuilder;
use serde_derive::Deserialize;
use serde_derive::Serialize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use serde_wasm_bindgen::from_value;
use lingua::Language;
 

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[derive(Serialize, Deserialize)]
enum LangResult { 
    German,
    English,
    Unknown
}


#[wasm_bindgen]
pub fn detect_languages(sentences_js: JsValue) -> JsValue {
    let sentences: Vec<String> = from_value(sentences_js).unwrap();
    let languages = vec![Language::English, Language::German];

    let detector = LanguageDetectorBuilder::from_languages(&languages).build();
    
    let results = sentences.into_iter()
        .map(|x| detector.detect_language_of(x))
        .map(|x| match x {
            Some(val) => match val {
                Language::German => LangResult::German,
                Language::English => LangResult::English,
                _ => LangResult::Unknown
            },
            None => LangResult::Unknown
        })
        .collect::<Vec<LangResult>>();
    
    return serde_wasm_bindgen::to_value(&results).unwrap();
}
