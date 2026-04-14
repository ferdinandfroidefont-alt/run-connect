export type StoryMusicTrack = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  artworkUrl?: string | null;
  previewUrl?: string | null;
};

export interface StoryMusicProvider {
  searchTracks(query: string): Promise<StoryMusicTrack[]>;
}

const LOCAL_TRACKS: StoryMusicTrack[] = [
  { id: "1", title: "Motivation Run", artist: "SportBeats", duration: "0:30", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "2", title: "Victory Lap", artist: "FitMusic", duration: "0:15", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "3", title: "Trail Vibes", artist: "NatureSound", duration: "0:30", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "4", title: "Speed Up", artist: "RunTempo", duration: "0:20", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "5", title: "Chill Recovery", artist: "ZenRun", duration: "0:30", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "6", title: "Race Day", artist: "SportBeats", duration: "0:15", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  { id: "7", title: "Endurance", artist: "FitMusic", duration: "0:25", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
  { id: "8", title: "Final Sprint", artist: "RunTempo", duration: "0:10", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
];

class LocalStoryMusicProvider implements StoryMusicProvider {
  async searchTracks(query: string): Promise<StoryMusicTrack[]> {
    const q = query.trim().toLowerCase();
    if (!q) return LOCAL_TRACKS;
    return LOCAL_TRACKS.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(q));
  }
}

export const storyMusicProvider: StoryMusicProvider = new LocalStoryMusicProvider();
