const CalendarioSidebar = {
  template: `
    <div class="p-4 border-t border-blue-700">
      <h3 class="text-sm font-semibold text-blue-100 mb-3 uppercase">📅 Calendário</h3>

      <!-- Seletor de Mês -->
      <div class="flex justify-between items-center mb-4">
        <button @click="mesPrevio" class="text-blue-200 hover:text-white text-lg">◀</button>
        <span class="text-sm font-semibold text-white">{{ nomeMes }} {{ anoAtual }}</span>
        <button @click="mesProximo" class="text-blue-200 hover:text-white text-lg">▶</button>
      </div>

      <!-- Calendário -->
      <div class="bg-blue-700 rounded-lg p-3">
        <!-- Dias da semana -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div v-for="dia in diasSemana" :key="dia" class="text-center text-xs font-semibold text-blue-200">
            {{ dia }}
          </div>
        </div>

        <!-- Dias do mês -->
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="dia in diasMes"
            :key="dia.id"
            @click="selecionarDia(dia.data)"
            :class="[
              'p-2 text-xs rounded font-semibold transition',
              dia.temFaturamento
                ? 'bg-green-400 text-blue-900 hover:bg-green-500 cursor-pointer'
                : dia.mesAtual
                ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
                : 'bg-blue-800 text-blue-400'
            ]"
            :disabled="!dia.mesAtual"
          >
            {{ dia.dia }}
          </button>
        </div>
      </div>

      <!-- Legenda -->
      <div class="mt-4 text-xs text-blue-200 space-y-1">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-green-400"></div>
          <span>Com faturamento</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-blue-600"></div>
          <span>Sem faturamento</span>
        </div>
      </div>

      <!-- Data Selecionada -->
      <div v-if="diaSelecionado" class="mt-4 p-3 bg-blue-700 rounded-lg border border-blue-600">
        <p class="text-xs text-blue-200">Data Selecionada</p>
        <p class="text-white font-semibold">{{ formatarDataBR(diaSelecionado) }}</p>
      </div>
    </div>
  `,
  data() {
    return {
      mesAtual: new Date().getMonth(),
      anoAtual: new Date().getFullYear(),
      diaSelecionado: null,
      faturamentosPorDia: {},
      diasSemana: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
      nomesMeses: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ]
    };
  },
  computed: {
    nomeMes() {
      return this.nomesMeses[this.mesAtual];
    },
    diasMes() {
      const diasArray = [];
      const primeiroDia = new Date(this.anoAtual, this.mesAtual, 1);
      const ultimoDia = new Date(this.anoAtual, this.mesAtual + 1, 0);
      const diasPrevios = primeiroDia.getDay();

      // Dias do mês anterior
      const ultimoDiaMesAnterior = new Date(this.anoAtual, this.mesAtual, 0).getDate();
      for (let i = diasPrevios - 1; i >= 0; i--) {
        diasArray.push({
          id: `prev-${i}`,
          dia: ultimoDiaMesAnterior - i,
          data: new Date(this.anoAtual, this.mesAtual - 1, ultimoDiaMesAnterior - i),
          mesAtual: false,
          temFaturamento: false
        });
      }

      // Dias do mês atual
      for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const dataStr = this.formatarDataISO(new Date(this.anoAtual, this.mesAtual, dia));
        diasArray.push({
          id: `atual-${dia}`,
          dia: dia,
          data: new Date(this.anoAtual, this.mesAtual, dia),
          mesAtual: true,
          temFaturamento: !!this.faturamentosPorDia[dataStr]
        });
      }

      // Dias do próximo mês
      const diasFaltantes = 42 - diasArray.length; // 6 linhas x 7 dias
      for (let dia = 1; dia <= diasFaltantes; dia++) {
        diasArray.push({
          id: `prox-${dia}`,
          dia: dia,
          data: new Date(this.anoAtual, this.mesAtual + 1, dia),
          mesAtual: false,
          temFaturamento: false
        });
      }

      return diasArray;
    }
  },
  methods: {
    mesPrevio() {
      if (this.mesAtual === 0) {
        this.mesAtual = 11;
        this.anoAtual--;
      } else {
        this.mesAtual--;
      }
    },
    mesProximo() {
      if (this.mesAtual === 11) {
        this.mesAtual = 0;
        this.anoAtual++;
      } else {
        this.mesAtual++;
      }
    },
    selecionarDia(data) {
      this.diaSelecionado = data;
      this.$emit('dia-selecionado', this.formatarDataISO(data));
    },
    formatarDataISO(data) {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    },
    formatarDataBR(data) {
      const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return data.toLocaleDateString('pt-BR', opcoes);
    },
    carregarFaturamentos() {
      try {
        // Buscar faturamentos do mês atual
        api.listarFaturamentos(30).then(response => {
          if (response.data.success) {
            // Mapear faturamentos por data
            this.faturamentosPorDia = {};
            response.data.data.forEach(fat => {
              this.faturamentosPorDia[fat.data] = fat;
            });
          }
        });
      } catch (error) {
        console.error('Erro ao carregar faturamentos:', error);
      }
    }
  },
  mounted() {
    this.carregarFaturamentos();
  }
};
