import React from 'react';
import { Category, Dish } from '../types';
import { ReelCard } from './ReelCard';

interface ReelStripProps {
  category: Category;
  onAddToOrder: (dish: Dish) => void;
}

export const ReelStrip: React.FC<ReelStripProps> = ({ category, onAddToOrder }) => {
  return (
    <div className="mb-8">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white tracking-wide">{category.title}</h2>
        <span className="text-xs text-gray-400 uppercase tracking-wider">Swipe for more &rarr;</span>
      </div>
      
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 px-2">
        {category.items.map((item) => (
          <ReelCard 
            key={item.id} 
            dish={item} 
            onAddToOrder={onAddToOrder} 
          />
        ))}
        {/* Spacer for end of list */}
        <div className="w-4 flex-shrink-0" />
      </div>
    </div>
  );
};
