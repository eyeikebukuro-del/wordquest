from PIL import Image
import sys

def remove_bg(input_path, output_path, tolerance=240):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            if item[0] >= tolerance and item[1] >= tolerance and item[2] >= tolerance:
                # White pixel -> Transparent
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        
        # Crop the image to its bounding box (remove empty transparent space)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)

        img.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    remove_bg(sys.argv[1], sys.argv[2])
