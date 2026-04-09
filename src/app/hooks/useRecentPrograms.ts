export type RecentProgram = {
    id: string;
    title: string;
    image?: string;
    url: string;
  };
  
  const STORAGE_KEY = "recent_programs";
  
  export function getRecentPrograms(): RecentProgram[] {
    if (typeof window === "undefined") return [];
  
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  
  export function addRecentProgram(program: RecentProgram) {
    if (typeof window === "undefined") return;
  
    let programs = getRecentPrograms();
  
    // éviter doublons
    programs = programs.filter((p) => p.id !== program.id);
  
    // ajouter au début
    programs.unshift(program);
  
    // garder max 3
    programs = programs.slice(0, 3);
  
    localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
  }