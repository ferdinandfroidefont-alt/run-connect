import { useSignedUrl } from '@/hooks/useSignedUrl';

interface SignedImageProps {
  fileUrl: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SignedImage = ({ fileUrl, alt = '', className, style }: SignedImageProps) => {
  const signedUrl = useSignedUrl(fileUrl);

  if (!signedUrl) {
    return <div className={`bg-muted/30 animate-pulse ${className}`} style={style} />;
  }

  return <img src={signedUrl} alt={alt} className={className} style={style} />;
};
