import json
import re

def is_kanji(char):
    return '\u4e00' <= char <= '\u9faf'

def extract_kanji_and_compounds(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    unique_kanji = set()
    compounds = []
    
    for word in data['words']:
        japanese = word.get('japanese', '')
        # Extract kanji
        for char in japanese:
            if is_kanji(char):
                unique_kanji.add(char)
        
        # Extract potential compounds (2 or more consecutive kanji)
        found_compounds = re.findall(r'[\u4e00-\u9faf]{2,}', japanese)
        for c in found_compounds:
            compounds.append((c, word['english'], word['id']))
            
    return sorted(list(unique_kanji)), compounds

if __name__ == "__main__":
    kanji, compounds = extract_kanji_and_compounds('src/vocabulary/words.json')
    
    with open('kanji_analysis.txt', 'w', encoding='utf-8') as out:
        out.write(f"Total Unique Kanji: {len(kanji)}\n")
        out.write(f"Kanji list: {''.join(kanji)}\n\n")
        out.write("Compounds found (Context):\n")
        # List all compounds to be safe
        for c, eng, wid in compounds:
            out.write(f"ID: {wid:4} | English: {eng:15} | Compound: {c}\n")
