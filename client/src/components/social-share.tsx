import { useState } from 'react';
import {
  TwitterShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
  TwitterIcon,
  FacebookIcon,
  LinkedinIcon,
  WhatsappIcon,
} from 'react-share';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SharePlatform } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface ShareButtonsProps {
  title: string;
  description: string;
  url: string;
  itemType: 'document' | 'device';
  itemId: number;
}

export function ShareButtons({
  title,
  description,
  url,
  itemType,
  itemId,
}: ShareButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleShare = async (platform: SharePlatform) => {
    try {
      const response = await apiRequest(
        'POST',
        `/api/${itemType}s/${itemId}/share`,
        { platform, url }
      );

      if (!response.ok) {
        throw new Error('Failed to share');
      }

      const { shareUrl } = await response.json();
      window.open(shareUrl, '_blank');

      toast({
        title: 'Shared successfully',
        description: `Item shared on ${platform.toLowerCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Share failed',
        description: 'Failed to share the item',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this item</DialogTitle>
            <DialogDescription>
              Share this item on social media to help find its owner
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center space-x-4 py-4">
            <TwitterShareButton
              url={url}
              title={title}
              onClick={() => handleShare('TWITTER')}
            >
              <TwitterIcon size={32} round />
            </TwitterShareButton>

            <FacebookShareButton
              url={url}
              title={title}
              onClick={() => handleShare('FACEBOOK')}
            >
              <FacebookIcon size={32} round />
            </FacebookShareButton>

            <LinkedinShareButton
              url={url}
              title={title}
              summary={description}
              onClick={() => handleShare('LINKEDIN')}
            >
              <LinkedinIcon size={32} round />
            </LinkedinShareButton>

            <WhatsappShareButton
              url={url}
              title={title}
              onClick={() => handleShare('WHATSAPP')}
            >
              <WhatsappIcon size={32} round />
            </WhatsappShareButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}