import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import OptimizedImage from "@/components/media/OptimizedImage";

interface Props {
  mentor: {
    name: string;
    bio: string | null;
    profile_image_url: string | null;
  };
  profileUrl: string;
}

const CourseMentorCard = ({ mentor, profileUrl }: Props) => (
  <div className="flex flex-col items-center text-center py-8">
    <div className="relative mb-4">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-primary/20 shadow-md">
        {mentor.profile_image_url ? (
          <OptimizedImage
            src={mentor.profile_image_url}
            alt={mentor.name}
            className="w-full h-full object-cover"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl sm:text-3xl">
            {mentor.name.charAt(0)}
          </div>
        )}
      </div>
      <BadgeCheck
        className="absolute -bottom-1 -left-1 w-7 h-7 text-primary drop-shadow-md"
        fill="white"
      />
    </div>
    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">{mentor.name}</h3>
    {mentor.bio && (
      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{mentor.bio}</p>
    )}
  </div>
);

export default CourseMentorCard;
