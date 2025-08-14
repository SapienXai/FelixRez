'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  requireTextConfirmation?: boolean;
  confirmationText?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  requireTextConfirmation = false,
  confirmationText = 'delete'
}: ConfirmationDialogProps) {
  const [inputText, setInputText] = useState('');

  const handleConfirm = () => {
    if (requireTextConfirmation && inputText !== confirmationText) {
      return;
    }
    onConfirm();
    onClose();
    setInputText('');
  };

  const handleClose = () => {
    onClose();
    setInputText('');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {requireTextConfirmation && (
              <>
                <br /><br />
                <strong>Type "{confirmationText}" to confirm:</strong>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {requireTextConfirmation && (
          <div className="py-4">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Type '${confirmationText}' to confirm`}
              className="w-full"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={requireTextConfirmation && inputText !== confirmationText}
            className={`${
              variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''
            } ${
              requireTextConfirmation && inputText !== confirmationText
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    requireTextConfirmation?: boolean;
    confirmationText?: string;
  } | null>(null);

  const showConfirmation = ({
    title,
    description,
    onConfirm,
    confirmText,
    cancelText,
    variant,
    requireTextConfirmation,
    confirmationText
  }: {
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    requireTextConfirmation?: boolean;
    confirmationText?: string;
  }) => {
    setConfig({ title, description, onConfirm, confirmText, cancelText, variant, requireTextConfirmation, confirmationText });
    setIsOpen(true);
  };

  const closeConfirmation = () => {
    setIsOpen(false);
    setConfig(null);
  };

  const ConfirmationDialogComponent = config ? (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={closeConfirmation}
      onConfirm={config.onConfirm}
      title={config.title}
      description={config.description}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      variant={config.variant}
      requireTextConfirmation={config.requireTextConfirmation}
      confirmationText={config.confirmationText}
    />
  ) : null;

  return {
    showConfirmation,
    ConfirmationDialogComponent
  };
}