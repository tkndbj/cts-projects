export interface Project {
    id: string;
    name: string;
    createdAt: Date;
    createdBy?: string;
  }
  
  export interface ItemField {
    title: string;
    description: string;
    images: string[];
    videoUrl?: string;
  }
  
  export interface ProjectItem {
    id: string;
    fields: ItemField[];
    createdAt: Date;
  }