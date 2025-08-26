import React, { useState } from 'react';
import { format, isToday, isYesterday, startOfWeek, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageTimestampProps {
  timestamp: string;
  isOwnMessage: boolean;
  showIndividualTime?: boolean;
}

export const MessageTimestamp: React.FC<MessageTimestampProps> = ({
  timestamp,
  isOwnMessage,
  showIndividualTime = false
}) => {
  const date = new Date(timestamp);
  
  if (showIndividualTime) {
    return (
      <div className={`text-xs opacity-70 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
        {format(date, 'HH:mm', { locale: fr })}
      </div>
    );
  }

  return null;
};

interface MessageSectionHeaderProps {
  timestamp: string;
}

export const MessageSectionHeader: React.FC<MessageSectionHeaderProps> = ({ timestamp }) => {
  const date = new Date(timestamp);
  
  const formatSectionDate = (date: Date) => {
    if (isToday(date)) {
      return `Aujourd'hui ${format(date, 'HH:mm', { locale: fr })}`;
    }
    
    if (isYesterday(date)) {
      return `Hier ${format(date, 'HH:mm', { locale: fr })}`;
    }
    
    if (isSameWeek(date, new Date(), { weekStartsOn: 1 })) {
      return format(date, 'eee. HH:mm', { locale: fr });
    }
    
    return format(date, 'dd/MM HH:mm', { locale: fr });
  };

  return (
    <div className="flex justify-center my-4">
      <div className="bg-muted/50 px-3 py-1 rounded-full">
        <span className="text-xs text-muted-foreground font-medium">
          {formatSectionDate(date)}
        </span>
      </div>
    </div>
  );
};

export const shouldShowSectionHeader = (currentMessage: any, previousMessage: any): boolean => {
  if (!previousMessage) return true;
  
  const current = new Date(currentMessage.created_at);
  const previous = new Date(previousMessage.created_at);
  
  // Show header if messages are more than 1 hour apart
  const hoursDiff = Math.abs(current.getTime() - previous.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 1;
};