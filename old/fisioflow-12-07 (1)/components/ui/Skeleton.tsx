import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={`bg-slate-700/50 rounded-md animate-pulse ${className}`}
    ></div>
  );
};

export default Skeleton;
