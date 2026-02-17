
import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '../../store';
import { Punch } from '../../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PunchSchema = z.object({
  employeeId: z.string().min(1, "L'ID de l'employé est requis"),
  employeeName: z.string().min(1, "Le nom de l'employé est requis"),
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
  state: z.enum(['C/In', 'C/Out']),
}).refine(data => {
    const dateTime = new Date(`${data.date}T${data.time}`);
    return dateTime <= new Date();
}, { message: "La date et l'heure ne peuvent pas être dans le futur", path: ['time'] });


type PunchFormData = z.infer<typeof PunchSchema>;

interface PunchModalProps {
    allPunches: Punch[];
}

export const PunchModal: React.FC<PunchModalProps> = ({ allPunches }) => {
  const { modal, closeModal, addHistory } = useAppStore();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PunchFormData>({
    resolver: zodResolver(PunchSchema),
  });

  const isEdit = modal.type === 'edit' && modal.data;

  const employees = useMemo(() => {
    const employeeMap = new Map<string, string>();
    allPunches.forEach(p => employeeMap.set(p.employeeId, p.employeeName));
    return Array.from(employeeMap.entries()).map(([id, name]) => ({ id, name }));
  }, [allPunches]);

  const watchedEmployeeId = watch('employeeId');

  useEffect(() => {
    if (watchedEmployeeId) {
        const matchingEmployee = employees.find(e => e.id === watchedEmployeeId);
        if (matchingEmployee) {
            setValue('employeeName', matchingEmployee.name);
        }
    }
  }, [watchedEmployeeId, employees, setValue]);

  useEffect(() => {
    if (isEdit) {
      const punch = modal.data as Punch;
      reset({
        employeeId: punch.employeeId,
        employeeName: punch.employeeName,
        date: format(punch.dateTime, 'yyyy-MM-dd'),
        time: format(punch.dateTime, 'HH:mm'),
        state: punch.state,
      });
    } else {
      reset({ employeeId: '', employeeName: '', date: '', time: '', state: 'C/In'});
    }
  }, [modal, reset, isEdit]);
  
  const mutation = useMutation({
    mutationFn: async (data: Punch) => {
        // Vérification proactive des doublons sur l'index unique [employeeId+dateTime]
        const existing = await db.punches
            .where('[employeeId+dateTime]')
            .equals([data.employeeId, data.dateTime])
            .first();

        if (existing && (!isEdit || existing.id !== data.id)) {
            throw new Error(`Un pointage existe déjà pour cet employé le ${format(data.dateTime, 'dd/MM/yyyy à HH:mm')}.`);
        }

        if(isEdit) {
            await db.punches.update(data.id!, data);
            return data;
        } else {
            const id = await db.punches.add(data);
            return {...data, id};
        }
    },
    onSuccess: (data) => {
        toast.success(`Pointage ${isEdit ? 'mis à jour' : 'ajouté'} avec succès.`);
        addHistory({ type: isEdit ? 'update' : 'add', data });
        queryClient.invalidateQueries({ queryKey: ['punches'] });
        closeModal();
    },
    onError: (err) => toast.error(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
  })

  const onSubmit = (data: PunchFormData) => {
    const dateTime = new Date(`${data.date}T${data.time}`);
    const punchData: Punch = {
        ...(isEdit ? modal.data as Punch : {}),
        uid: isEdit ? (modal.data as Punch).uid : `manual-${Date.now()}`,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        dateTime,
        state: data.state,
        originalRecord: 'Saisie manuelle',
        manual: true,
    };
    mutation.mutate(punchData);
  };

  if (!modal.type || modal.type === 'confirm-clear') return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{isEdit ? 'Modifier' : 'Ajouter'} un pointage</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ID Employé</label>
            <input list="employee-ids" {...register('employeeId')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            <datalist id="employee-ids">
                {employees.map(e => <option key={e.id} value={e.id} />)}
            </datalist>
            {errors.employeeId && <p className="text-red-500 text-sm mt-1">{errors.employeeId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom Employé</label>
            <input {...register('employeeName')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
             {errors.employeeName && <p className="text-red-500 text-sm mt-1">{errors.employeeName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" {...register('date')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Heure</label>
              <input type="time" {...register('time')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2"><input type="radio" value="C/In" {...register('state')} /> Entrée</label>
                <label className="flex items-center gap-2"><input type="radio" value="C/Out" {...register('state')} /> Sortie</label>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                {mutation.isPending ? 'Chargement...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
