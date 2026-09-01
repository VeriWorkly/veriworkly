/**
 * Minimal single-page PDF writer for layout-detection fixtures.
 *
 * Hand-built rather than checked in as binaries so the geometry under test is visible in the
 * test itself: the difference between the two-column and single-column cases is two numbers,
 * and a reviewer can see exactly what is being asserted without opening a PDF viewer.
 */
export function buildPdf(contentStream: string): Buffer {
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    `<</Length ${Buffer.byteLength(contentStream)}>>\nstream\n${contentStream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefAt = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

/** One text-showing operator at an absolute page position, in points from the bottom left. */
export function text(x: number, y: number, value: string) {
  return `BT /F1 10 Tf ${x} ${y} Td (${value.replace(/([()\\])/g, "\\$1")}) Tj ET`;
}

export const LEFT_COLUMN = [
  "Automated nightly regression verification runs",
  "Owned the on call rotation for twelve services",
  "Cut median dashboard load from 3.2s to 900ms",
  "Introduced Terraform modules across all envs",
  "Jane Doe Senior Software Engineer",
  "Led migration of a monolith to 30 services",
  "Built CI CD pipelines with Kubernetes",
  "Designed a PostgreSQL sharding strategy",
  "Mentored five engineers over 18 months",
  "Developed a real time analytics service",
  "Reduced infrastructure cost by 310000",
  "Improved test coverage from 41 to 88",
];

export const RIGHT_COLUMN = [
  "Certifications and professional training",
  "Public speaking and conference talks",
  "Open source maintenance and reviews",
  "Volunteering and community mentoring",
  "Skills and Technologies listing",
  "Go TypeScript Python and Node",
  "React Redux and GraphQL clients",
  "PostgreSQL Redis and MongoDB",
  "Kubernetes Docker and Terraform",
  "Amazon Web Services and Azure",
  "Kafka RabbitMQ and streaming",
  "Education University of California",
];

/** Draws a stroked `rows` x `cols` grid with text in every cell. */
export function ruledTable(rows: number, cols: number) {
  const [x0, y0, cellW, cellH] = [60, 380, 160, 40];
  const ops = ["0.5 w"];

  for (let row = 0; row <= rows; row += 1)
    ops.push(`${x0} ${y0 + row * cellH} m ${x0 + cols * cellW} ${y0 + row * cellH} l S`);
  for (let col = 0; col <= cols; col += 1)
    ops.push(`${x0 + col * cellW} ${y0} m ${x0 + col * cellW} ${y0 + rows * cellH} l S`);
  for (let row = 0; row < rows; row += 1)
    for (let col = 0; col < cols; col += 1)
      ops.push(
        text(x0 + col * cellW + 8, y0 + (rows - row - 1) * cellH + 15, `cell ${row}${col} value`),
      );

  return ops.join("\n");
}
