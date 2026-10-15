import React from 'react';
import Icon from './Icon';

interface LoadMoreProps {
  loading: boolean;
  /** Why the last attempt failed; the button then offers a retry instead. */
  error?: string | null;
  onClick: () => void;
}

/** The button under a paged list: fetches the next page, or offers a retry when that failed. */
const LoadMore = ({ loading, error, onClick }: LoadMoreProps) => (
  <div className="flex justify-center pt-3">
    <button className="btn btn-out btn-sm" type="button" disabled={loading} onClick={onClick}>
      {loading && <Icon name="loader" size={14} className="animate-spin" />}
      <span>{error ? "Couldn't load more · Try again" : loading ? 'Loading…' : 'Load more'}</span>
    </button>
  </div>
);

export default LoadMore;
