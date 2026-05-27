import { FlossColor, RGB } from "../types";

const rgbToLab = (rgb: RGB): { L: number; a: number; b: number } => {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
};

export const DMC_FLOSS_COLORS: FlossColor[] = [
  { id: "B5200", name: "Snow White", rgb: { r: 255, g: 255, b: 255 } },
  { id: "310", name: "Black", rgb: { r: 0, g: 0, b: 0 } },
  { id: "413", name: "Dark Pewter Grey", rgb: { r: 88, g: 88, b: 88 } },
  { id: "414", name: "Dark Steel Grey", rgb: { r: 132, g: 132, b: 132 } },
  { id: "762", name: "Very Dark Pearl Grey", rgb: { r: 168, g: 168, b: 168 } },
  { id: "318", name: "Steel Grey - Light", rgb: { r: 192, g: 192, b: 192 } },
  { id: "321", name: "Red", rgb: { r: 210, g: 0, b: 0 } },
  { id: "498", name: "Dark Red", rgb: { r: 155, g: 0, b: 0 } },
  { id: "666", name: "Bright Red", rgb: { r: 230, g: 0, b: 0 } },
  { id: "720", name: "Light Parrot Green", rgb: { r: 0, g: 177, b: 46 } },
  { id: "700", name: "Bright Green", rgb: { r: 0, g: 135, b: 0 } },
  { id: "895", name: "Very Dark Hunter Green", rgb: { r: 0, g: 95, b: 0 } },
  { id: "995", name: "Very Dark Electric Blue", rgb: { r: 0, g: 64, b: 128 } },
  { id: "3843", name: "Electric Blue", rgb: { r: 0, g: 103, b: 210 } },
  { id: "3755", name: "Baby Blue - Very Light", rgb: { r: 173, g: 216, b: 230 } },
  { id: "444", name: "Dark Lemon", rgb: { r: 255, g: 255, b: 0 } },
  { id: "973", name: "Bright Canary", rgb: { r: 255, g: 243, b: 65 } },
  { id: "722", name: "Light Orange Spice", rgb: { r: 255, g: 140, b: 0 } },
  { id: "921", name: "Medium Old Gold", rgb: { r: 190, g: 140, b: 63 } },
  { id: "754", name: "Very Light Peach", rgb: { r: 255, g: 215, b: 175 } },
  { id: "761", name: "Very Light Dusty Rose", rgb: { r: 240, g: 185, b: 185 } },
  { id: "3607", name: "Very Dark Plum", rgb: { r: 123, g: 65, b: 115 } },
  { id: "3608", name: "Dark Plum", rgb: { r: 161, g: 89, b: 145 } },
  { id: "3716", name: "Very Dark Dusty Rose", rgb: { r: 183, g: 99, b: 99 } },
  { id: "801", name: "Dark Coffee Brown", rgb: { r: 101, g: 67, b: 33 } },
  { id: "3371", name: "Black Brown", rgb: { r: 67, g: 41, b: 20 } },
  { id: "433", name: "Brown", rgb: { r: 140, g: 95, b: 55 } },
  { id: "782", name: "Dark Topaz", rgb: { r: 175, g: 115, b: 55 } },
  { id: "783", name: "Light Topaz", rgb: { r: 215, g: 175, b: 125 } },
  { id: "898", name: "Very Dark Coffee Cream", rgb: { r: 215, g: 195, b: 165 } },
  { id: "3865", name: "Ultra Dark Dirt Brown", rgb: { r: 86, g: 59, b: 37 } },
  { id: "718", name: "Plum", rgb: { r: 145, g: 80, b: 120 } },
  { id: "719", name: "Medium Plum", rgb: { r: 183, g: 124, b: 159 } },
  { id: "550", name: "Very Dark Violet", rgb: { r: 91, g: 59, b: 155 } },
  { id: "552", name: "Medium Violet", rgb: { r: 145, g: 120, b: 210 } },
  { id: "553", name: "Violet Light", rgb: { r: 175, g: 155, b: 225 } },
  { id: "341", name: "Medium Blue Violet", rgb: { r: 85, g: 110, b: 180 } },
  { id: "340", name: "Med Baby Blue", rgb: { r: 118, g: 165, b: 230 } },
  { id: "797", name: "Dark Royal Blue", rgb: { r: 59, g: 108, b: 187 } },
  { id: "996", name: "Medium Electric Blue", rgb: { r: 53, g: 105, b: 185 } },
].map((c) => ({
  ...c,
  lab: rgbToLab(c.rgb),
}));

export const getDMCColorById = (id: string): FlossColor | undefined => {
  return DMC_FLOSS_COLORS.find((c) => c.id === id);
};

export const getClosestDMCColor = (rgb: RGB): FlossColor => {
  const lab = rgbToLab(rgb);
  let minDist = Infinity;
  let closest = DMC_FLOSS_COLORS[0];

  for (const color of DMC_FLOSS_COLORS) {
    const dist = Math.sqrt(
      Math.pow(lab.L - color.lab.L, 2) +
        Math.pow(lab.a - color.lab.a, 2) +
        Math.pow(lab.b - color.lab.b, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }

  return closest;
};
