export interface GetAllSessionsResponse {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface GetChatHistoryResponse {
  id: string;
  role: string;
  chat: string;
  createdAt: Date;
}
