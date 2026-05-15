import React, { useState } from 'react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
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
    const time = format(date, "HH:mm", { locale: fr });
    if (isToday(date)) {
      return `Aujourd'hui · ${time}`;
    }
    if (isYesterday(date)) {
      return `Hier · ${time}`;
    }
    const raw = format(date, "EEEE d MMMM '·' HH:mm", { locale: fr });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  return (
    <div className="flex items-center justify-center py-2">
      <span
        className="text-center text-[12px] font-bold text-[#8E8E93]"
        style={{ letterSpacing: "-0.01em" }}
      >
        {formatSectionDate(date)}
      </span>
    </div>
  );
};

export const shouldShowSectionHeader = (currentMessage: any, previousMessage: any): boolean => {
  if (!previousMessage) return true;
  
  const current = new Date(currentMessage.created_at);
  const previous = new Date(previousMessage.created_at);
  
  if (startOfDay(current).getTime() !== startOfDay(previous).getTime()) return true;
  const hoursDiff = Math.abs(current.getTime() - previous.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 1;
};