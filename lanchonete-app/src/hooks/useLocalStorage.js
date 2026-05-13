import { useState, useEffect, useCallback } from 'react';
import { saveData, limparHistoricoAntigo } from '../utils/storage.js';

export function useLocalStorage(initialValue) {
  const [value, setValue] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar do localStorage ao montar
  useEffect(() => {
    const stored = localStorage.getItem('lanchonete_app_data');
    if (stored) {
      try {
        let data = JSON.parse(stored);
        // Garantir que despesas existe (para dados antigos)
        if (!data.despesas) {
          data.despesas = [];
        }
        // Limpar histórico antigo
        data.vendas = limparHistoricoAntigo(data.vendas);
        setValue(data);
        saveData(data);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Salvar SEMPRE que value mudar (importante!)
  useEffect(() => {
    if (isLoaded) {
      saveData(value);
    }
  }, [value, isLoaded]);

  // Salvar também quando a página fecha/muda de aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveData(value);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [value]);

  const updateValue = useCallback((newValue) => {
    setValue(newValue);
  }, []);

  return [value, updateValue, isLoaded];
}
