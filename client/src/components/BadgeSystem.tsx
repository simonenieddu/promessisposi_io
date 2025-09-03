import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Star, 
  Award, 
  Target, 
  Zap, 
  BookOpen, 
  Brain, 
  Flame, 
  Medal,
  Crown,
  Clock,
  Compass,
  Users
} from "lucide-react";

interface UserBadge {
  id: number;
  userId: number;
  badgeId: number;
  earnedAt: string;
  progress: number;
  badge: {
    id: number;
    name: string;
    description: string;
    icon: string;
    color: string;
    category: string;
    requirement: string;
    points: number;
    rarity: string;
    isActive: boolean;
    createdAt: string;
  };
}

interface UserStats {
  id: number;
  userId: number;
  totalPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  chaptersCompleted: number;
  quizzesCompleted: number;
  perfectQuizzes: number;
  averageQuizScore: number;
  readingTimeMinutes: number;
  level: number;
  experience: number;
  rank: number;
  lastActive: string;
  updatedAt: string;
}

interface UserStreaks {
  reading: {
    id: number;
    userId: number;
    type: string;
    currentStreak: number;
    longestStreak: number;
    lastActivity: string;
    createdAt: string;
  } | null;
  quiz: {
    id: number;
    userId: number;
    type: string;
    currentStreak: number;
    longestStreak: number;
    lastActivity: string;
    createdAt: string;
  } | null;
}

const iconMap: { [key: string]: React.ComponentType<any> } = {
  'book-open': BookOpen,
  'books': BookOpen,
  'graduation-cap': Award,
  'crown': Crown,
  'brain': Brain,
  'lightbulb': Brain,
  'star': Star,
  'medal': Medal,
  'fire': Flame,
  'flame': Flame,
  'zap': Zap,
  'compass': Compass,
  'clock': Clock,
  'trophy': Trophy
};

const rarityColors: { [key: string]: string } = {
  'common': 'bg-gray-100 border-gray-300 text-gray-800',
  'rare': 'bg-blue-100 border-blue-300 text-blue-800',
  'epic': 'bg-purple-100 border-purple-300 text-purple-800',
  'legendary': 'bg-yellow-100 border-yellow-300 text-yellow-800'
};

export default function BadgeSystem({ userId }: { userId: number }) {
  const { data: userBadges = [], isLoading: badgesLoading } = useQuery<UserBadge[]>({
    queryKey: [`/api/users/${userId}/badges`],
  });

  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: [`/api/users/${userId}/stats`],
  });

  const { data: userStreaks, isLoading: streaksLoading } = useQuery<UserStreaks>({
    queryKey: [`/api/users/${userId}/streaks`],
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<any[]>({
    queryKey: ['/api/leaderboard'],
  });

  if (badgesLoading || statsLoading || streaksLoading) {
    return <div className="p-6">Caricamento...</div>;
  }

  const experienceToNextLevel = userStats ? 1000 - (userStats.experience % 1000) : 0;
  const experienceProgress = userStats ? (userStats.experience % 1000) / 1000 * 100 : 0;

  return (
    <div className="space-y-6">
      {/* User Level & Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                {userStats?.level || 1}
              </div>
              <div>
                <CardTitle className="text-xl">Livello {userStats?.level || 1}</CardTitle>
                <CardDescription>
                  {experienceToNextLevel} XP al prossimo livello
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{userStats?.totalPoints || 0}</div>
              <div className="text-sm text-gray-500">Punti Totali</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={experienceProgress} className="h-2" />
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>{userStats?.experience || 0} XP</span>
            <span>{((userStats?.level || 1) * 1000)} XP</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="badges" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="badges">Badge</TabsTrigger>
          <TabsTrigger value="stats">Statistiche</TabsTrigger>
          <TabsTrigger value="streaks">Streak</TabsTrigger>
          <TabsTrigger value="leaderboard">Classifica</TabsTrigger>
        </TabsList>
        
        <TabsContent value="badges" className="space-y-4">
          <div className="grid gap-4">
            {userBadges.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nessun badge ancora guadagnato</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Completa capitoli e quiz per sbloccare i tuoi primi badge!
                  </p>
                </CardContent>
              </Card>
            ) : (
              userBadges.map((userBadge) => {
                const IconComponent = iconMap[userBadge.badge.icon] || Trophy;
                const rarityClass = rarityColors[userBadge.badge.rarity] || rarityColors['common'];
                
                return (
                  <Card key={userBadge.id} className={`border-2 ${rarityClass}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${userBadge.badge.color === 'gold' ? 'bg-yellow-500' : 
                          userBadge.badge.color === 'purple' ? 'bg-purple-500' :
                          userBadge.badge.color === 'blue' ? 'bg-blue-500' :
                          userBadge.badge.color === 'green' ? 'bg-green-500' :
                          userBadge.badge.color === 'red' ? 'bg-red-500' :
                          userBadge.badge.color === 'orange' ? 'bg-orange-500' :
                          'bg-gray-500'} text-white`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{userBadge.badge.name}</CardTitle>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{userBadge.badge.rarity}</Badge>
                              <span className="text-sm font-medium text-blue-600">
                                +{userBadge.badge.points} XP
                              </span>
                            </div>
                          </div>
                          <CardDescription className="mt-1">
                            {userBadge.badge.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Categoria: {userBadge.badge.category}</span>
                        <span>Guadagnato: {new Date(userBadge.earnedAt).toLocaleDateString('it-IT')}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.chaptersCompleted || 0}</div>
                <div className="text-sm text-gray-500">Capitoli Letti</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Brain className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.quizzesCompleted || 0}</div>
                <div className="text-sm text-gray-500">Quiz Completati</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.perfectQuizzes || 0}</div>
                <div className="text-sm text-gray-500">Quiz Perfetti</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.averageQuizScore || 0}%</div>
                <div className="text-sm text-gray-500">Media Quiz</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span>Streak di Lettura</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  {userStreaks?.reading?.currentStreak || 0} giorni
                </div>
                <div className="text-sm text-gray-500">
                  Record: {userStreaks?.reading?.longestStreak || 0} giorni
                </div>
                {userStreaks?.reading?.lastActivity && (
                  <div className="text-xs text-gray-400 mt-2">
                    Ultima attività: {new Date(userStreaks.reading.lastActivity).toLocaleDateString('it-IT')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <span>Streak Quiz</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  {userStreaks?.quiz?.currentStreak || 0} giorni
                </div>
                <div className="text-sm text-gray-500">
                  Record: {userStreaks?.quiz?.longestStreak || 0} giorni
                </div>
                {userStreaks?.quiz?.lastActivity && (
                  <div className="text-xs text-gray-400 mt-2">
                    Ultima attività: {new Date(userStreaks.quiz.lastActivity).toLocaleDateString('it-IT')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Classifica Generale</span>
              </CardTitle>
              <CardDescription>I migliori studenti della piattaforma</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div>Caricamento classifica...</div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  Classifica non disponibile
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry: any, index: number) => (
                    <div key={entry.userId} className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                      index === 1 ? 'bg-gray-50 border border-gray-200' :
                      index === 2 ? 'bg-orange-50 border border-orange-200' :
                      'bg-white border border-gray-100'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {entry.user.firstName} {entry.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            Livello {entry.level} • {entry.chaptersCompleted} capitoli
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{entry.points}</div>
                        <div className="text-xs text-gray-500">punti</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}