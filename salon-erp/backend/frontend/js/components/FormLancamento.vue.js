const FormLancamento = {
  template: `
    <div class="mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">📝 Lançar Faturamento</h2>

        <form @submit.prevent="salvarFaturamento" class="space-y-4">
          <!-- Campo Data -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Data</label>
              <input
                v-model="formulario.data"
                type="date"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
              <p v-if="erro" class="text-red-600 text-sm mt-2">{{ erro }}</p>
            </div>

            <!-- Campo Total -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Total (R$)</label>
              <input
                v-model.number="formulario.total"
                type="number"
                step="0.01"
                min="0.01"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
            </div>
          </div>

          <!-- Mensagens de Feedback -->
          <div v-if="mensagemSucesso" class="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            ✅ {{ mensagemSucesso }}
          </div>

          <!-- Botão Salvar -->
          <div>
            <button
              type="submit"
              :disabled="carregando"
              class="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ carregando ? 'Salvando...' : '💾 Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      formulario: {
        data: this.obterDataHoje(),
        total: null
      },
      carregando: false,
      erro: '',
      mensagemSucesso: ''
    };
  },
  methods: {
    obterDataHoje() {
      const hoje = new Date();
      return hoje.toISOString().split('T')[0];
    },
    async salvarFaturamento() {
      this.erro = '';
      this.mensagemSucesso = '';

      // Validações
      if (!this.formulario.data) {
        this.erro = 'Data é obrigatória';
        return;
      }
      if (!this.formulario.total || this.formulario.total <= 0) {
        this.erro = 'Total deve ser maior que zero';
        return;
      }

      // Validar data não futura
      const dataSelecionada = new Date(this.formulario.data);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (dataSelecionada > hoje) {
        this.erro = 'Data não pode ser futura';
        return;
      }

      this.carregando = true;

      try {
        const response = await api.criarFaturamento(
          this.formulario.data,
          this.formulario.total
        );

        if (response.data.success) {
          this.mensagemSucesso = 'Faturamento salvo com sucesso!';
          this.formulario.total = null;
          this.formulario.data = this.obterDataHoje();

          // Emitir evento para recarregar dados
          this.$emit('receita-criada');

          // Limpar mensagem após 3 segundos
          setTimeout(() => {
            this.mensagemSucesso = '';
          }, 3000);
        }
      } catch (error) {
        this.erro = error.response?.data?.error || 'Erro ao salvar faturamento';
      } finally {
        this.carregando = false;
      }
    }
  }
};
