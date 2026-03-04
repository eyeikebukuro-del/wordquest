from PIL import Image
import sys
import os

def remove_white_bg(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # 白背景(240以上)を透明にする。
            if item[0] > 230 and item[1] > 230 and item[2] > 230:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved to {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    brain_dir = r"C:\Users\石塚　匡彦\.gemini\antigravity\brain\65d4b6a3-5b67-4f63-a90a-dd2478004a04"
    public_dir = r"C:\Users\石塚　匡彦\.gemini\antigravity\scratch\wordquest\public\characters"
    
    os.makedirs(public_dir, exist_ok=True)
    
    files = {
        "skeleton_1772611021138.png": "skeleton.png",
        "golem_1772611038451.png": "golem.png",
        "dark_mage_1772611054522.png": "dark_mage.png",
        "spider_1772611070120.png": "spider.png"
    }
    
    for in_name, out_name in files.items():
        remove_white_bg(os.path.join(brain_dir, in_name), os.path.join(public_dir, out_name))
