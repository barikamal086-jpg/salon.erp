const SeletorPeriodo = {
  template: `
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 class="text-lg font-bold text-gray-900 mb-4">📅 Selecione o Período</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Data Início -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Data Início</label>
          <input
            v-model="dataInicio"
            type="date"
            @change="atualizarPeriodo"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>

        <!-- Data Fim -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Data Fim</label>
          <input
            v-model="dataFim"
            type="date"
            @change="atualizarPeriodo"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>

        <!-- Botões Rápidos -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Atalhos</label>
          <div class="flex gap-2">
            <button
              @click="setUltimos7Dias"
              class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Últimos 7d
            </button>
            <button
              @click="setUltimos30Dias"
              class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Últimos 30d
            </button>
          </div>
        </div>
      </div>

      <!-- Info do Período -->
      <div v-if="periodoInfo" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        📊 {{ periodoInfo }}
      </div>
    </div>
  `,
  data() {
    return {
      dataInicio: this.obterDataInicio(),
      dataFim: this.obterDataFim()
    };
  },
  computed: {
    periodoInfo() {
      if (this.dataInicio && this.dataFim) {
        const inicio = new Date(this.dataInicio);
        const fim = new Date(this.dataFim);
        const dias = Math.floor((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
        return `Período: ${this.formatarData(this.dataInicio)} até ${this.formatarData(this.dataFim)} (${dias} dias)`;
      }
      return null;
    }
  },
  methods: {
    obterDataInicio() {
      const hoje = new Date();
      const inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
      return inicio.toISOString().split('T')[0];
    },
    obterDataFim() {
      const hoje = new Date();
      return hoje.toISOString().split('T')[0];
    },
    atualizarPeriodo() {
      // Garantir que data fim não é menor que data início
      if (this.dataFim < this.dataInicio) {
        this.dataFim = this.dataInicio;
      }
      this.$emit('periodo-alterado', {
        dataInicio: this.dataInicio,
        dataFim: this.dataFim
      });
    },
    setUltimos7Dias() {
      const hoje = new Date();
      const inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      this.dataInicio = inicio.toISOString().split('T')[0];
      this.dataFim = hoje.toISOString().split('T')[0];
      this.atualizarPeriodo();
    },
    setUltimos30Dias() {
      const hoje = new Date();
      const inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
      this.dataInicio = inicio.toISOString().split('T')[0];
      this.dataFim = hoje.toISOString().split('T')[0];
      this.atualizarPeriodo();
    },
    formatarData(data) {
      const opcoes = { day: '2-digit', month: '2-digit', year: 'numeric' };
      return new Date(data).toLocaleDateString('pt-BR', opcoes);
    }
  },
  mounted() {
    this.atualizarPeriodo();
  }
};
