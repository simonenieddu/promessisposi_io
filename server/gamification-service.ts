import { db } from "./db";
import { 
  badges, 
  userBadges, 
  userStreaks, 
  userStats,
  users,
  type Badge,
  type UserBadge,
  type UserStreak,
  type UserStats,
  type InsertUserBadge,
  type InsertUserStreak,
  type InsertUserStats
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export class GamificationService {
  // Badge methods
  async getAllBadges(): Promise<Badge[]> {
    return await db.select().from(badges).where(eq(badges.isActive, true)).orderBy(badges.category, badges.points);
  }

  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    return await db
      .select({
        id: userBadges.id,
        userId: userBadges.userId,
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
        progress: userBadges.progress,
        badge: badges
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));
  }

  async checkAndAwardBadge(userId: number, badgeRequirement: any): Promise<UserBadge | null> {
    // Find matching badge
    const matchingBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true));

    for (const badge of matchingBadges) {
      const requirement = JSON.parse(badge.requirement);
      
      // Check if user already has this badge
      const existingBadge = await db
        .select()
        .from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)))
        .limit(1);

      if (existingBadge.length > 0) continue;

      // Check if requirement is met
      if (await this.checkBadgeRequirement(userId, requirement)) {
        // Award badge
        const [newUserBadge] = await db
          .insert(userBadges)
          .values({
            userId,
            badgeId: badge.id,
            earnedAt: new Date()
          })
          .returning();

        // Add points to user
        await this.addExperiencePoints(userId, badge.points);

        return newUserBadge;
      }
    }

    return null;
  }

  private async checkBadgeRequirement(userId: number, requirement: any): Promise<boolean> {
    const userStatsData = await this.getUserStats(userId);
    
    switch (requirement.type) {
      case "chapters_read":
        return userStatsData.chaptersCompleted >= requirement.count;
      
      case "quizzes_completed":
        return userStatsData.quizzesCompleted >= requirement.count;
      
      case "perfect_quiz":
        return userStatsData.perfectQuizzes >= requirement.count;
      
      case "reading_streak":
        const readingStreak = await this.getUserStreak(userId, "reading");
        return readingStreak ? readingStreak.currentStreak >= requirement.count : false;
      
      case "glossary_terms":
        // This would need to be tracked separately
        return false;
      
      case "fast_reading":
        // This would need reading time tracking
        return false;
      
      default:
        return false;
    }
  }

  // User stats methods
  async getUserStats(userId: number): Promise<UserStats> {
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats) {
      // Create initial stats
      const [newStats] = await db
        .insert(userStats)
        .values({
          userId,
          totalPoints: 0,
          weeklyPoints: 0,
          monthlyPoints: 0,
          chaptersCompleted: 0,
          quizzesCompleted: 0,
          perfectQuizzes: 0,
          averageQuizScore: 0,
          readingTimeMinutes: 0,
          level: 1,
          experience: 0,
          rank: 0
        })
        .returning();
      
      return newStats;
    }

    return stats;
  }

  async updateUserStats(userId: number, updates: Partial<UserStats>): Promise<UserStats> {
    const [updatedStats] = await db
      .update(userStats)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(userStats.userId, userId))
      .returning();

    return updatedStats;
  }

  async addExperiencePoints(userId: number, points: number): Promise<void> {
    const stats = await this.getUserStats(userId);
    const newExperience = stats.experience + points;
    const newTotalPoints = stats.totalPoints + points;
    
    // Calculate new level (every 1000 XP = 1 level)
    const newLevel = Math.floor(newExperience / 1000) + 1;

    await this.updateUserStats(userId, {
      experience: newExperience,
      totalPoints: newTotalPoints,
      level: newLevel,
      weeklyPoints: stats.weeklyPoints + points,
      monthlyPoints: stats.monthlyPoints + points
    });
  }

  // Streak methods
  async getUserStreak(userId: number, type: string): Promise<UserStreak | null> {
    const [streak] = await db
      .select()
      .from(userStreaks)
      .where(and(eq(userStreaks.userId, userId), eq(userStreaks.type, type)));

    return streak || null;
  }

  async updateStreak(userId: number, type: string): Promise<UserStreak> {
    const existingStreak = await this.getUserStreak(userId, type);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (!existingStreak) {
      // Create new streak
      const [newStreak] = await db
        .insert(userStreaks)
        .values({
          userId,
          type,
          currentStreak: 1,
          longestStreak: 1,
          lastActivity: now
        })
        .returning();

      return newStreak;
    }

    // Check if streak should continue or reset
    const lastActivity = new Date(existingStreak.lastActivity);
    const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrentStreak: number;
    let newLongestStreak: number;

    if (daysSinceLastActivity === 0) {
      // Same day, no change
      return existingStreak;
    } else if (daysSinceLastActivity === 1) {
      // Next day, continue streak
      newCurrentStreak = existingStreak.currentStreak + 1;
      newLongestStreak = Math.max(existingStreak.longestStreak, newCurrentStreak);
    } else {
      // More than 1 day, reset streak
      newCurrentStreak = 1;
      newLongestStreak = existingStreak.longestStreak;
    }

    const [updatedStreak] = await db
      .update(userStreaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActivity: now
      })
      .where(and(eq(userStreaks.userId, userId), eq(userStreaks.type, type)))
      .returning();

    return updatedStreak;
  }

  // Leaderboard methods
  async getLeaderboard(timeframe: 'weekly' | 'monthly' | 'total' = 'total', limit: number = 10): Promise<any[]> {
    const pointsColumn = timeframe === 'weekly' ? userStats.weeklyPoints :
                        timeframe === 'monthly' ? userStats.monthlyPoints :
                        userStats.totalPoints;

    return await db
      .select({
        userId: userStats.userId,
        points: pointsColumn,
        level: userStats.level,
        chaptersCompleted: userStats.chaptersCompleted,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(userStats)
      .innerJoin(users, eq(userStats.userId, users.id))
      .orderBy(desc(pointsColumn))
      .limit(limit);
  }

  // Event handlers for achievements
  async onChapterCompleted(userId: number): Promise<UserBadge[]> {
    const stats = await this.getUserStats(userId);
    await this.updateUserStats(userId, {
      chaptersCompleted: stats.chaptersCompleted + 1
    });

    // Update reading streak
    await this.updateStreak(userId, 'reading');

    // Check for badges
    const badges = [];
    const newBadge = await this.checkAndAwardBadge(userId, { type: 'chapters_read' });
    if (newBadge) badges.push(newBadge);

    return badges;
  }

  async onQuizCompleted(userId: number, score: number, maxScore: number): Promise<UserBadge[]> {
    const stats = await this.getUserStats(userId);
    const isPerfect = score === maxScore;
    const newQuizzesCompleted = stats.quizzesCompleted + 1;
    const newPerfectQuizzes = stats.perfectQuizzes + (isPerfect ? 1 : 0);
    const newAverageScore = Math.round(((stats.averageQuizScore * stats.quizzesCompleted) + score) / newQuizzesCompleted);

    await this.updateUserStats(userId, {
      quizzesCompleted: newQuizzesCompleted,
      perfectQuizzes: newPerfectQuizzes,
      averageQuizScore: newAverageScore
    });

    // Check for badges
    const badges = [];
    const quizBadge = await this.checkAndAwardBadge(userId, { type: 'quizzes_completed' });
    if (quizBadge) badges.push(quizBadge);

    if (isPerfect) {
      const perfectBadge = await this.checkAndAwardBadge(userId, { type: 'perfect_quiz' });
      if (perfectBadge) badges.push(perfectBadge);
    }

    return badges;
  }
}

export const gamificationService = new GamificationService();