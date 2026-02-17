
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { Punch } from '../types';
import { parseTxtFile, parseHtmlFile } from '../utils/parsers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db';
import { toast } from 'sonner';

interface FileUploadProps {
    onProcessing: (isProcessing: boolean) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onProcessing }) => {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const addPunchesMutation = useMutation({
    mutationFn: async (newPunches: Punch[]) => {
        // 1. Déduplication interne du lot (même employé, même moment)
        const uniqueMap = new Map<string, Punch>();
        newPunches.forEach(p => {
            const key = `${p.employeeId}-${p.dateTime.getTime()}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, p);
            }
        });
        const dedupedInBatch = Array.from(uniqueMap.values());

        // 2. Vérification contre la base de données pour éviter ConstraintError
        // On vérifie l'existence de chaque pointage via l'index composite
        const checkPromises = dedupedInBatch.map(async (p) => {
            const exists = await db.punches
                .where('[employeeId+dateTime]')
                .equals([p.employeeId, p.dateTime])
                .count();
            return exists === 0 ? p : null;
        });

        const results = await Promise.all(checkPromises);
        const punchesToAdd = results.filter((p): p is Punch => p !== null);

        if (punchesToAdd.length === 0) {
            return { count: 0, skipped: dedupedInBatch.length };
        }

        const count = await db.punches.bulkAdd(punchesToAdd);
        return { count, skipped: dedupedInBatch.length - punchesToAdd.length };
    },
    onSuccess: (res) => {
        if (res.count > 0) {
            toast.success(`${res.count} pointages ont été ajoutés.`);
        }
        if (res.skipped > 0) {
            toast.info(`${res.skipped} pointages ignorés (déjà présents).`);
        }
        if (res.count === 0 && res.skipped > 0) {
            toast.warning("Aucune nouvelle donnée : tous les pointages sont déjà enregistrés.");
        }
        queryClient.invalidateQueries({ queryKey: ['punches']});
    },
    onError: (err) => {
        toast.error(`Erreur lors de l'ajout: ${err instanceof Error ? err.message : 'inconnue'}`);
    },
    onSettled: () => {
        onProcessing(false);
    }
  });

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onProcessing(true);
    setError(null);

    try {
      const content = await file.text();
      let punches: Punch[] = [];
      const now = Date.now();

      if (file.name.endsWith('.txt')) {
        punches = parseTxtFile(content);
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        punches = parseHtmlFile(content);
      } else {
        throw new Error('Type de fichier non supporté. Veuillez utiliser un fichier .txt ou .html.');
      }

      if (punches.length === 0) {
        throw new Error("Aucune donnée de pointage valide n'a été trouvée dans le fichier.");
      }
      
      // On passe les pointages bruts, la mutation s'occupera de la validation/déduplication
      addPunchesMutation.mutate(punches);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      setError(errorMessage);
      toast.error(errorMessage);
      onProcessing(false);
    } finally {
      event.target.value = '';
    }
  }, [onProcessing, addPunchesMutation]);

  return (
    <div className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition-colors">
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center justify-center">
          <UploadIcon className="w-12 h-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold text-blue-600">Cliquez pour importer</span> ou glissez-déposez
          </p>
          <p className="text-xs text-gray-500">Fichiers TXT (LGHD) ou HTML supportés</p>
        </div>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".txt,.html,.htm" />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
