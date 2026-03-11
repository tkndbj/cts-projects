export interface Project {
    id: string;
    name: string;
    createdAt: Date;
  }
  
  export interface ItemField {
    title: string;
    description: string;
    images: string[];
  }
  
  export interface ProjectItem {
    id: string;
    fields: ItemField[];
    createdAt: Date;
  }