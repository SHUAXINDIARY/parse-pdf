export type PdfLink = {
  id: string;
  url: string;
  label: string;
  page: number;
  rect: [number, number, number, number];
};

export type PdfLine = {
  id: string;
  page: number;
  text: string;
  x: number;
  y: number;
  height: number;
  links: PdfLink[];
};

