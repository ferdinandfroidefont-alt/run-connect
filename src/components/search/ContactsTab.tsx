import { Phone } from 'lucide-react';

export const ContactsTab = ({ searchQuery }: { searchQuery: string }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Phone className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Fonctionnalité à venir</h3>
      <p className="text-sm text-muted-foreground">
        Bientôt : recherchez vos amis parmi vos contacts téléphoniques
      </p>
    </div>
  );
};
