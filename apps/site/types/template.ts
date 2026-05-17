export interface TemplateMeta {
  id: string;
  name: string;
  documentType: string;
  description: string;
  accentColor: string;
  previewImage: string;
  tags: string[];
}

export type TemplateDefinition = TemplateMeta;
