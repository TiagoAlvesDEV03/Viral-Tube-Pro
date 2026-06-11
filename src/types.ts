export interface Campaign {
  id: string;
  type: "view" | "like" | "comment" | "subscribe";
  title: string;
  youtubeId: string;
  channelTitle: string;
  currentCount: number;
  targetCount: number;
  creditsReward: number;
  videoSeconds?: number;
  userEmail: string;
  createdAt: string;
  completedUsers: string[];
  isPinned?: boolean;
  positionIndex?: number;
  isBoosted?: boolean;
  isPartnerChannel?: boolean;
}

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

export interface GlobalStats {
  totalViewsGenerated: number;
  totalLikesDropped: number;
  totalCommentsCreated: number;
  totalSubscriptionsCompleted: number;
  totalActiveMembers: number;
}
