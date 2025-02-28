import { SharePlatform, ShareMetrics } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { storage } from '../storage';

interface ShareOptions {
  title: string;
  description: string;
  image?: string;
  url: string;
  platform: SharePlatform;
}

export class SocialShareService {
  private static formatShareText(title: string, description: string): string {
    const maxLength = 280; // Twitter's character limit
    const baseText = `${title}\n\n${description}`;
    return baseText.length > maxLength 
      ? `${baseText.slice(0, maxLength - 3)}...` 
      : baseText;
  }

  private static async recordShare(
    itemType: 'document' | 'device',
    itemId: number,
    platform: SharePlatform,
    success: boolean
  ): Promise<void> {
    const shareMetric: ShareMetrics = {
      platform,
      timestamp: new Date().toISOString(),
      success,
      engagementCount: 0,
    };

    if (itemType === 'document') {
      await storage.updateDocument(itemId, {
        socialShares: [shareMetric],
        lastSharedAt: new Date().toISOString(),
        totalShares: { increment: 1 },
      });
    } else {
      await storage.updateDevice(itemId, {
        socialShares: [shareMetric],
        lastSharedAt: new Date().toISOString(),
        totalShares: { increment: 1 },
      });
    }
  }

  public static async shareToSocialMedia(
    options: ShareOptions,
    itemType: 'document' | 'device',
    itemId: number
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const text = this.formatShareText(options.title, options.description);
      
      // Share based on platform
      switch (options.platform) {
        case 'TWITTER':
          // Using Twitter Web Intent for client-side sharing
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(options.url)}`;
          await this.recordShare(itemType, itemId, 'TWITTER', true);
          return { success: true, url: twitterUrl };

        case 'FACEBOOK':
          // Using Facebook Share Dialog
          const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(options.url)}`;
          await this.recordShare(itemType, itemId, 'FACEBOOK', true);
          return { success: true, url: fbUrl };

        case 'LINKEDIN':
          // Using LinkedIn Share Dialog
          const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(options.url)}`;
          await this.recordShare(itemType, itemId, 'LINKEDIN', true);
          return { success: true, url: linkedInUrl };

        case 'WHATSAPP':
          // Using WhatsApp Share Link
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n${options.url}`)}`;
          await this.recordShare(itemType, itemId, 'WHATSAPP', true);
          return { success: true, url: whatsappUrl };

        default:
          throw new Error(`Unsupported platform: ${options.platform}`);
      }
    } catch (error) {
      console.error('Error sharing to social media:', error);
      await this.recordShare(itemType, itemId, options.platform, false);
      return { success: false, error: 'Failed to share content' };
    }
  }

  public static async getShareMetrics(
    itemType: 'document' | 'device',
    itemId: number
  ): Promise<{
    totalShares: number;
    platformMetrics: Record<SharePlatform, number>;
  }> {
    const item = itemType === 'document'
      ? await storage.getDocument(itemId)
      : await storage.getDevice(itemId);

    if (!item?.socialShares) {
      return {
        totalShares: 0,
        platformMetrics: {
          TWITTER: 0,
          FACEBOOK: 0,
          LINKEDIN: 0,
          WHATSAPP: 0,
        },
      };
    }

    const platformMetrics = item.socialShares.reduce((acc, share) => {
      acc[share.platform] = (acc[share.platform] || 0) + 1;
      return acc;
    }, {} as Record<SharePlatform, number>);

    return {
      totalShares: item.totalShares || 0,
      platformMetrics,
    };
  }
}
