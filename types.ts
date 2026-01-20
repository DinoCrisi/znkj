
export enum ProjectStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  DONE = 'DONE'
}

export enum ViewType {
  HOME = 'HOME',
  UPLOAD = 'UPLOAD',
  ANALYSIS = 'ANALYSIS',
  SETUP = 'SETUP',
  SUCCESS = 'SUCCESS',
  HISTORY = 'HISTORY',
  ASSETS = 'ASSETS'
}

export interface VideoScriptSegment {
  id: string;
  time: string;
  hook_type: string;
  visual_prompt: string;
  voiceover_text: string;
  retention_strategy: string;
  thumbnail?: string;
  sourceTitle?: string;
  niche?: string;
}

export interface DeconstructedVideo {
  id: string;
  title: string;
  niche: string;
  formula_name: string;
  structure: string;
  pace: string;
  core_elements: string;
  segments: VideoScriptSegment[];
  createdAt: string;
}

export interface ProductInfo {
  name: string;
  sellingPoints: string[];
  images: string[];
}

export interface GeneratedVideo {
  id: string;
  version: string;
  sellingPoint: string;
  thumbnail: string;
}

export interface AppState {
  currentView: ViewType;
  status: ProjectStatus;
  analysis: DeconstructedVideo | null;
  productInfo: ProductInfo;
  genCount: number;
  results: GeneratedVideo[];
  history: DeconstructedVideo[];
  assets: VideoScriptSegment[];
}
