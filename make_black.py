from PIL import Image
import numpy as np

# Load image
try:
    img = Image.open('logo.png').convert('RGBA')
    data = np.array(img)

    # White background threshold
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    white_areas = (r > 240) & (g > 240) & (b > 240)

    # Change white to black
    data[..., :3][white_areas] = [0, 0, 0]

    # Save new image
    Image.fromarray(data).save('logo_black.png')
    print("SUCCESS")
except Exception as e:
    print(f"Error: {e}")
