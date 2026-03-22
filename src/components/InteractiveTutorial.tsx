import React, { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { TutorialStep } from '@/hooks/useTutorial';

interface InteractiveTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

// Custom tooltip component with iOS style
const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  size,
  isLastStep,
  skipProps,
}: TooltipRenderProps) => {
  const { t } = useLanguage();
  
  return (
    <div
      {...tooltipProps}
      className="bg-background rounded-2xl shadow-2xl border border-border/50 max-w-[min(320px,calc(100vw-32px))] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">
            {index + 1} / {size}
          </span>
        </div>
        <button
          {...skipProps}
          className="p-1 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="text-base font-semibold text-foreground">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.content}
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((index + 1) / size) * 100}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 bg-muted/30">
        {index > 0 ? (
          <Button
            {...backProps}
            variant="ghost"
            size="sm"
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('tutorial.back')}
          </Button>
        ) : (
          <Button
            {...skipProps}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            {t('tutorial.skip')}
          </Button>
        )}

        <Button
          {...primaryProps}
          size="sm"
          className="gap-1"
        >
          {isLastStep ? t('tutorial.finish') : t('tutorial.next')}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  steps,
  onComplete,
  onSkip,
}) => {
  const [run, setRun] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);

  // Convert our steps to Joyride format
  const joyrideSteps: Step[] = steps.map((step) => ({
    target: step.target,
    title: step.title,
    content: step.content,
    placement: step.placement || 'auto',
    disableBeacon: step.disableBeacon ?? true,
    spotlightClicks: false,
  }));

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle finished or skipped
    if (status === STATUS.FINISHED) {
      onComplete();
      return;
    }

    if (status === STATUS.SKIPPED) {
      onSkip();
      return;
    }

    // Handle step navigation
    if (type === 'step:after') {
      if (action === 'next') {
        setStepIndex(index + 1);
      } else if (action === 'prev') {
        setStepIndex(index - 1);
      }
    }

    // Handle close button
    if (action === 'close') {
      onSkip();
    }
  };

  return (
    <Joyride
      steps={joyrideSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      disableOverlayClose
      disableScrolling
      spotlightPadding={8}
      floaterProps={{
        disableAnimation: false,
        offset: 16,
      }}
      styles={{
        options: {
          arrowColor: 'hsl(var(--background))',
          backgroundColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          zIndex: 10000,
        },
        spotlight: {
          borderRadius: 16,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    />
  );
};
