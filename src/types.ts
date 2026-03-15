export interface WritingSession {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

export interface Suggestion {
  id: string;
  type: 'rewrite' | 'feedback' | 'proactive';
  originalText?: string;
  suggestedText?: string;
  feedback?: string;
  startIndex?: number;
  endIndex?: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
}
