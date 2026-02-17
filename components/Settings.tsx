
import React from 'react';
import { useAppStore } from '../store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../db';
import { toast } from 'sonner';
import { AppSettings, Punch } from '../types';
import { z } from 'zod';

const PunchImportSchema = z.object({
  id: z.number().optional(),
  uid: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  dateTime: z.string().transform((val) => new Date(val)),
  state: z.enum(['C/In', 'C/Out']),
  originalRecord: z.string(),
  manual: z.boolean().optional(),
});

const SettingsImportSchema = z.object({
    id: z.number().optional(),
    deductLunchBreak: z.boolean(),
    lunchBreakThreshold: z.number(),
    holidays: z.array(z.string()),
});

const ImportFileSchema = z.object({
    punches: z.array(PunchImportSchema),
    settings: z.array(SettingsImportSchema),
});


export const Settings: React.FC = () => {
    const { openModal } = useAppStore();
    const queryClient = useQueryClient();

    const { data: settings } = useQuery<AppSettings>({
        queryKey: ['settings'],
        queryFn: async () => (await db.settings.toCollection().first()) || { deductLunchBreak: true, lunchBreakThreshold: 45, holidays: [] },
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async (newSettings: AppSettings) => {
            const currentSettings = await db.settings.toCollection().first();
            if (currentSettings?.id) {
                // FIX: Use `put` instead of `update` to replace the entire object.
                // `update` expects a partial object of changes, which caused a type error.
                return db.settings.put({ ...newSettings, id: currentSettings.id });
            }
            // Ensure no `id` property is passed to `add` if it's the first time.
            const { id, ...settingsToAdd } = newSettings;
            return db.settings.add(settingsToAdd);
        },
        onSuccess: () => {
            toast.success("Paramètres sauvegardés");
            queryClient.invalidateQueries({ queryKey: ['settings']});
        }
    });

    const importMutation = useMutation({
        mutationFn: async (data: { punches: Punch[], settings: AppSettings[] }) => {
            if (!window.confirm("Cette action remplacera toutes les données existantes par le contenu du fichier. Voulez-vous continuer ?")) {
                throw new Error("Importation annulée par l'utilisateur.");
            }
            await db.transaction('rw', db.punches, db.settings, async () => {
                await db.punches.clear();
                await db.settings.clear();
                await db.punches.bulkPut(data.punches);
                if (data.settings.length > 0) {
                    await db.settings.put(data.settings[0]);
                }
            });
        },
        onSuccess: () => {
            toast.success("Données importées avec succès.");
            queryClient.invalidateQueries();
        },
        onError: (err) => {
            toast.error(`Erreur d'importation : ${err instanceof Error ? err.message : 'inconnue'}`);
        }
    });

    const handleToggleLunchBreak = () => {
        if (settings) {
            updateSettingsMutation.mutate({ ...settings, deductLunchBreak: !settings.deductLunchBreak });
        }
    };
    
    const exportData = async () => {
        try {
            const punches = await db.punches.toArray();
            const settings = await db.settings.toArray();
            const exportObj = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                punches,
                settings,
            };
            const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Données exportées avec succès.");
        } catch (error) {
            toast.error("Erreur lors de l'exportation des données.");
        }
    }
    
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result;
                if (typeof content !== 'string') {
                    throw new Error("Impossible de lire le fichier.");
                }
                const jsonData = JSON.parse(content);

                const validationResult = ImportFileSchema.safeParse(jsonData);

                if (!validationResult.success) {
                    console.error("Erreur de validation Zod:", validationResult.error.flatten());
                    throw new Error("Le fichier JSON est invalide ou ne correspond pas au format attendu.");
                }
                
                const validatedData = validationResult.data;

                importMutation.mutate({
                    punches: validatedData.punches,
                    settings: validatedData.settings,
                });

            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur lors de la lecture ou de l'analyse du fichier.");
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };


    return (
        <div className="p-4 bg-white rounded-lg shadow">
             <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuration & Gestion</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Déduire la pause déjeuner automatiquement</span>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings?.deductLunchBreak ?? true} onChange={handleToggleLunchBreak} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                <div className="flex flex-wrap gap-4 pt-4 border-t">
                     <button onClick={exportData} className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">💾 Export Complet (JSON)</button>
                     <label className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer">
                        📥 Import JSON
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                     </label>
                     <button onClick={() => openModal('confirm-clear')} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">🗑️ Effacer toutes les données</button>
                </div>
             </div>
        </div>
    )
}
