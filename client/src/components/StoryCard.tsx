import { Link } from 'react-router-dom';
import type { Story } from '../types';
import { formatDate } from '../utils/format';

export default function StoryCard({ story }: { story: Story }) {
  return (
    <div className="card h-100 shadow-sm">
      {story.imageUrl && (
        <img
          src={story.imageUrl}
          className="card-img-top cover"
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="card-body d-flex flex-column">
        <h2 className="h5 card-title">{story.title}</h2>
        <div className="small text-muted mb-2">
          {story.destination ? story.destination.city : 'Unknown place'} · {formatDate(story.travelDate)} · by{' '}
          {story.author ? story.author.name : 'deleted user'}
        </div>
        {story.hidden && <span className="badge text-bg-secondary mb-2 align-self-start">Hidden by admin</span>}
        <p className="card-text small flex-grow-1">
          {story.text.length > 160 ? story.text.slice(0, 160) + '...' : story.text}
        </p>
        <Link to={`/stories/${story._id}`} className="btn btn-sm btn-outline-primary align-self-start">
          Read story
        </Link>
      </div>
    </div>
  );
}
