
import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db';
import { toast } from 'sonner';

export const ConfirmClearModal: React.FC = () => {
    const { modal, closeModal } = useAppStore();
    const [isChecked, setIsChecked] = useState(false);
    const queryClient = useQueryClient();

    const clearMutation = useMutation({
        mutationFn: async () => {
            await db.punches.clear();
            await db.settings.clear();
        },
        onSuccess: () => {
            toast.success("Toutes les données ont été effacées.");
            queryClient.invalidateQueries();
            closeModal();
        },
        onError: () => toast.error("Erreur lors de la suppression des données."),
    });
    
    if (modal.type !== 'confirm-clear') return null;

    const handleClear = () => {
        if(isChecked) {
            clearMutation.mutate();
        } else {
            toast.error("Veuillez cocher la case pour confirmer.")
        }
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-red-600">Confirmation Requise</h2>
                <p className="mb-4">Vous êtes sur le point de supprimer définitivement toutes les données de pointage et de configuration. Cette action est irréversible.</p>
                <div className="mb-6">
                    <label className="flex items-center">
                        <input type="checkbox" checked={isChecked} onChange={() => setIsChecked(!isChecked)} className="h-4 w-4 text-red-600 border-gray-300 rounded" />
                        <span className="ml-2 text-sm text-gray-700">Je comprends que cette action est irréversible.</span>
                    </label>
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded">Annuler</button>
                    <button onClick={handleClear} disabled={!isChecked} className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-red-300 disabled:cursor-not-allowed">Supprimer Définitivement</button>
                </div>
            </div>
        </div>
    );
}
