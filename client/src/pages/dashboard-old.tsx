import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Trophy, Target, Clock, Star, TrendingUp, BookOpen, Award, Zap, ArrowRight, CheckCircle } from "lucide-react";
import Header from "@/components/header";
import BadgeSystem from "@/components/BadgeSystem";

interface UserStats {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    points: number;
    level: string;
    joinedDate: string;
    lastActive: string;
  };
  progress: {
    completedChapters: number;
    totalChapters: number;
    completionPercentage: number;
  };
  quizzes: {
    completed: number;
    averageScore: number;
    scores: any[];
  };
  achievements: {
    unlocked: number;
    list: any[];
  };
}

interface Chapter {
  id: number;
  number: number;
  title: string;
  summary: string;
  isUnlocked: boolean;
}

interface UserProgress {
  chapterId: number;
  isCompleted: boolean;
  readingProgress: number;
  timeSpent: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: [`/api/users/${user?.id}/stats`],
    enabled: !!user,
  });

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery<Chapter[]>({
    queryKey: ["/api/chapters"],
  });

  const { data: progressData = [], isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: [`/api/users/${user?.id}/progress`],
  });

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (statsLoading || chaptersLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-edo-brown"></div>
      </div>
    );
  }

  // Create progress map for easy lookup
  const userProgress = progressData.reduce((acc: Record<number, UserProgress>, progress: UserProgress) => {
    acc[progress.chapterId] = progress;
    return acc;
  }, {});

  const getChapterProgress = (chapterId: number) => {
    const progress = userProgress[chapterId];
    return progress ? progress.readingProgress : 0;
  };

  const isChapterCompleted = (chapterId: number) => {
    const progress = userProgress[chapterId];
    return progress ? progress.isCompleted : false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="modern-card p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative">
              <h1 className="text-4xl font-avenir font-bold mb-3">
                Ciao, {userStats?.user?.firstName || user.firstName}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Ecco un riepilogo dei tuoi progressi nello studio de I Promessi Sposi
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="gamification">Badge e Classifiche</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Stats */}
              <div className="lg:col-span-1 space-y-6">
                {/* User Stats */}
                <div className="grid grid-cols-2 gap-4">
              <div className="modern-card stat-card text-center bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-4">
                  <Book className="h-6 w-6" />
                </div>
                <p className="text-2xl font-bold mb-2">{userStats?.progress?.completedChapters || 0}</p>
                <p className="text-sm opacity-90">Capitoli completati</p>
              </div>

              <div className="modern-card stat-card text-center bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-4">
                  <Star className="h-6 w-6" />
                </div>
                <p className="text-2xl font-bold mb-2">{userStats?.user?.points || 0}</p>
                <p className="text-sm opacity-90">Punti totali</p>
              </div>

              <div className="modern-card stat-card text-center bg-gradient-to-br from-green-500 to-green-600 text-white p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-4">
                  <Trophy className="h-6 w-6" />
                </div>
                <p className="text-2xl font-bold mb-2">{userStats?.quizzes?.averageScore || 0}</p>
                <p className="text-sm opacity-90">Punteggio medio</p>
              </div>

              <div className="modern-card stat-card text-center bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-4">
                  <Award className="h-6 w-6" />
                </div>
                <p className="text-2xl font-bold mb-2">{userStats?.achievements?.unlocked || 0}</p>
                <p className="text-sm opacity-90">Traguardi sbloccati</p>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="modern-card">
              <div className="card-header p-6 pb-2">
                <h3 className="flex items-center gap-2 text-literary-blue font-avenir font-semibold">
                  <TrendingUp className="h-5 w-5" />
                  Progresso generale
                </h3>
              </div>
              <div className="space-y-4 px-6 pb-6">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-warm-gray">Lettura completata</span>
                    <span className="font-medium text-literary-blue">{userStats?.progress?.completionPercentage || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill bg-gradient-to-r from-literary-blue to-purple-500" 
                      style={{ width: `${userStats?.progress?.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium">
                    {userStats?.user?.level || "Principiante"}
                  </span>
                </div>
              </div>
              </div>
            </div>

            {/* Right Column - Chapter Progress & Selection */}
            <div className="lg:col-span-2 space-y-6">
            {/* Chapter Progress Bars */}
            <div className="modern-card">
              <div className="card-header p-6 pb-2">
                <h3 className="flex items-center gap-2 text-literary-blue font-avenir font-semibold">
                  <BookOpen className="h-5 w-5" />
                  Progresso di lettura per capitolo
                </h3>
              </div>
              <div className="px-6 pb-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {chapters.slice(0, 10).map((chapter: Chapter) => {
                    const progress = getChapterProgress(chapter.id);
                    const completed = isChapterCompleted(chapter.id);
                    
                    return (
                      <div key={chapter.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {completed ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-literary-blue" />
                            )}
                            <span className="text-sm font-medium text-warm-gray">
                              Capitolo {chapter.number}
                            </span>
                          </div>
                          <span className="text-sm text-literary-blue font-medium">{progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className={`progress-fill ${completed ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-literary-blue to-purple-500'}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-warm-gray/70 truncate">
                          {chapter.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chapter Selection */}
            <div className="modern-card">
              <div className="card-header flex items-center justify-between p-6 pb-2">
                <h3 className="flex items-center gap-2 text-literary-blue font-avenir font-semibold">
                  <Book className="h-5 w-5" />
                  Scegli un capitolo da leggere
                </h3>
                <button 
                  onClick={() => navigate("/chapters")}
                  className="modern-btn-secondary text-sm flex items-center gap-1"
                >
                  Vedi tutti
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chapters.slice(0, 6).map((chapter: Chapter) => {
                    const progress = getChapterProgress(chapter.id);
                    const completed = isChapterCompleted(chapter.id);
                    
                    return (
                      <div 
                        key={chapter.id}
                        className="modern-card chapter-card cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105"
                        onClick={() => navigate(`/chapters/${chapter.id}`)}
                      >
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <span className={`chapter-badge ${completed ? 'completed' : ''}`}>
                              Cap. {chapter.number}
                            </span>
                            {completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                          </div>
                          <h4 className="font-medium text-sm mb-3 text-warm-gray line-clamp-2">
                            {chapter.title}
                          </h4>
                          <div className="space-y-3">
                            <div className="progress-bar">
                              <div 
                                className={`progress-fill ${completed ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-literary-blue to-purple-500'}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-warm-gray/70">
                              <span>{progress}% completato</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>15 min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => navigate("/chapters")}
                    className="modern-btn-primary flex items-center justify-center gap-2"
                  >
                    Esplora tutti i capitoli
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}