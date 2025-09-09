import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, CheckCircle, Lock } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/header";

interface Chapter {
  id: number;
  number: number;
  title: string;
  summary: string;
  isUnlocked: boolean;
  estimatedReadTime?: number;
}

interface UserProgress {
  chapterId: number;
  isCompleted: boolean;
  readingProgress: number;
  timeSpent: number;
}

// Introduzione rimossa come richiesto

export default function Chapters() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: chapters = [], isLoading: chaptersLoading } = useQuery<Chapter[]>({
    queryKey: ["/api/chapters"],
  });

  const { data: progressData = [], isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: [`/api/users/${user?.id}/progress`],
    enabled: !!user,
  });

  const userProgress = progressData.reduce((acc: Record<number, UserProgress>, progress: UserProgress) => {
    acc[progress.chapterId] = progress;
    return acc;
  }, {});

  const allChapters = chapters;

  const handleChapterClick = (chapterId: number) => {
    setLocation(`/chapters/${chapterId}`);
  };

  const getProgressPercentage = (chapterId: number) => {
    const progress = userProgress[chapterId];
    return progress ? progress.readingProgress : 0;
  };

  const isChapterCompleted = (chapterId: number) => {
    const progress = userProgress[chapterId];
    return progress ? progress.isCompleted : false;
  };

  const getReadingTime = (chapterId: number) => {
    const progress = userProgress[chapterId];
    return progress ? Math.round(progress.timeSpent) : 0;
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (chaptersLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-literary-blue mx-auto mb-4"></div>
              <p className="text-literary-blue">Caricamento capitoli...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-avenir font-bold text-literary-blue mb-4">
            I Promessi Sposi
          </h1>
          <p className="text-lg text-warm-gray max-w-2xl mx-auto">
            Scegli un capitolo per iniziare o continuare la tua lettura del capolavoro di Alessandro Manzoni
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allChapters.map((chapter) => {
            const progressPercentage = getProgressPercentage(chapter.id);
            const isCompleted = isChapterCompleted(chapter.id);
            const readingTime = getReadingTime(chapter.id);
            const isUnlocked = (chapter as any).is_unlocked !== false; // Default to unlocked

            return (
              <Card 
                key={chapter.id} 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isUnlocked 
                    ? 'hover:scale-105 bg-white' 
                    : 'bg-gray-100 cursor-not-allowed opacity-60'
                } ${isCompleted ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => isUnlocked && handleChapterClick(chapter.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : isUnlocked ? (
                        <BookOpen className="h-5 w-5 text-edo-brown" />
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400" />
                      )}
                      <Badge variant={isCompleted ? "default" : isUnlocked ? "secondary" : "outline"}>
                        {chapter.id === 0 ? "Introduzione" : `Capitolo ${chapter.number}`}
                      </Badge>
                    </div>
                    {chapter.estimatedReadTime && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{chapter.estimatedReadTime} min</span>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {chapter.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm leading-relaxed">
                    {chapter.summary}
                  </CardDescription>
                  
                  {isUnlocked && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-medium">{progressPercentage}%</span>
                      </div>
                      <Progress 
                        value={progressPercentage} 
                        className="h-2"
                      />
                      {readingTime > 0 && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Tempo di lettura: {readingTime} min</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    className={`w-full ${
                      isCompleted 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : isUnlocked 
                          ? 'bg-edo-brown hover:bg-edo-brown/90' 
                          : 'bg-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!isUnlocked}
                  >
                    {isCompleted 
                      ? 'Rileggi' 
                      : progressPercentage > 0 
                        ? 'Continua lettura' 
                        : isUnlocked 
                          ? 'Inizia lettura' 
                          : 'Bloccato'
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}