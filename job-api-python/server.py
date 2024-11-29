from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import string
import unicodedata
from langdetect import detect, DetectorFactory, LangDetectException
from googletrans import Translator
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.util import ngrams
import spacy
from collections import Counter

# Configuração do Flask
app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas

# Inicializar o tradutor, stopwords e spaCy
translator = Translator()
stop_words = set(stopwords.words('portuguese'))
nlp = spacy.load('pt_core_news_sm')

# Palavras comuns adicionais que podem não ser úteis para identificar competências
additional_common_words = {
    'empresa', 'americar', 'assistencia' ,'medico','latino','engenharia','auxilio','estao','restaurante','sempre','ref','agora', 'continuar', 'areo','sucesso' , 'humir','outro ','on' ,'line', 'officer','office', 'trabalhar', 'requirements', 'process' ,'stages' ,'step','and' ,'qualificatiom' ,'requisito' ,'qualificacoes','diverso' ,'sub', 'representar', 'estreito' ,'colaboracao','empregador','diversidade' ,'equidade' ,'inclusao', 'raco', 'cor', 'religiao', 'oportunidade', 'igual' 'trabalhar','orientacao', 'sexual' , 'sexo', 'bom','promocoes','dia', "saude",'valer', 'sao', 'Paulo', 'day', 'fazer' ,'parte', 'Brasil', 'off', 'aniversario','crenca' ,'religioso','alimentacao','licenca', 'seguro', 'vida','maternidade' ,'paternidade','beneficio', 'ir', 'cair' ,'rotina',"odontologico",'experiencia', 'voce', 'conhecimento', "pessoa", 'todo', 'necessário', 'capacidade', 'trabalho', 'responsabilidade'
}

# Definir semente para resultados consistentes na detecção de idioma
DetectorFactory.seed = 0

# Dicionário para corrigir lematização de palavras específicas
lemmatization_corrections = {
    'dados': 'dado',  # Mantém 'dados' como substantivo
    'dado': 'dado' ,    # Mantém 'dado' como substantivo
    'gerenciamento' : 'gestao' ,
    'gerenciar' : 'gestao'
}

# Função para limpar, lematizar e filtrar palavras irrelevantes do texto
def clean_and_lemmatize_text(text):
    if not text or not isinstance(text, str):  # Verifica se o texto é None ou não é string
        return None

    # Define um padrão para remover emojis e caracteres não ASCII
    emoji_pattern = re.compile("["
                               u"\U0001F600-\U0001F64F"  # emoticons
                               u"\U0001F300-\U0001F5FF"  # símbolos e pictogramas
                               u"\U0001F680-\U0001F6FF"  # transporte e símbolos de mapa
                               u"\U0001F700-\U0001F77F"  # símbolos alquímicos
                               u"\U0001F780-\U0001F7FF"  # símbolos de jogos
                               u"\U0001F800-\U0001F8FF"  # símbolos de suplemento de área
                               u"\U0001F900-\U0001F9FF"  # emojis de rostos/expressões
                               u"\U0001FA00-\U0001FA6F"  # emojis de atividades esportivas
                               u"\U0001FA70-\U0001FAFF"  # emojis de alimentos
                               u"\U00002702-\U000027B0"  # emojis diversos
                               "]+", flags=re.UNICODE)

    # Converte o texto para minúsculas e remove emojis
    text = emoji_pattern.sub('', text.lower())

    # Remove acentos
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')

    # Remove pontuações e caracteres específicos
    text = re.sub(f'[{re.escape(string.punctuation)}]', ' ', text)

    # Remove palavras com números, caracteres especiais e quebras de linha
    text = re.sub(r'\w*\d\w*|[\n·‘’“”…]', ' ', text)

    # Tokeniza o texto em palavras e remove stopwords
    words = [word for word in word_tokenize(text) if word not in stop_words]

    # Realiza a lematização com spaCy
    doc = nlp(' '.join(words))
    lemmatized_words = []
    for token in doc:
        # Aplica correção específica para palavras conhecidas
        if token.text in lemmatization_corrections:
            lemmatized_words.append(lemmatization_corrections[token.text])
        else:
            lemmatized_words.append(token.lemma_)

    # Remove palavras comuns adicionais antes de retornar
    filtered_words = [
        word for word in lemmatized_words
        if word not in additional_common_words and len(word) > 1
    ]

    return filtered_words

def translate_to_portuguese(text):
    if not text or not isinstance(text, str) or not text.strip():  # Verifica entradas inválidas
        print("Texto inválido fornecido para tradução.")
        return None
    try:
        detected_language = detect(text)  # Detecta o idioma
        if detected_language != 'pt':  # Apenas traduz se não for português
            translation = translator.translate(text, dest='pt')
            
            # Verifica se a tradução retornou um objeto válido
            if translation and hasattr(translation, 'text'):
                translated_text = translation.text
                if detect(translated_text) == 'pt':  # Valida a tradução
                    return translated_text
                else:
                    print(f"Texto não traduzido corretamente: {translated_text}")
                    return None
            else:
                print("Erro: Tradução retornou None ou resposta inesperada.")
                return None
        return text  # Retorna o texto original se já estiver em português
    except LangDetectException as e:
        print(f"Erro na detecção do idioma: {e}")
        return None
    except Exception as e:
        print(f"Erro geral na tradução: {e}")
        return None
    
# Função para calcular a frequência de palavras, bigramas e trigramas
def calculate_ngram_frequencies(words):
    # Conta a frequência das palavras
    word_counts = Counter(words)

    # Filtra palavras comuns irrelevantes
    filtered_word_counts = {
        word: count for word, count in word_counts.items()
        if word not in additional_common_words and len(word) > 1
    }

    # Calcula bigramas e trigramas
    bigrams = list(ngrams(words, 2))
    trigrams = list(ngrams(words, 3))

    # Conta a frequência de bigramas e trigramas
    bigram_counts = Counter(bigrams)
    trigram_counts = Counter(trigrams)

    return filtered_word_counts, bigram_counts, trigram_counts

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        descriptions = data.get('descriptions', [])
        if not descriptions:
            return jsonify({'error': 'No descriptions provided'}), 400

        # Traduzir, limpar, lematizar e agregar todas as palavras das descrições recebidas
        all_words = []
        for description in descriptions:
            # Traduz para português se necessário
            translated_description = translate_to_portuguese(description)
            if translated_description:
                lemmatized_words = clean_and_lemmatize_text(translated_description)
                if lemmatized_words:
                    all_words.extend(lemmatized_words)

        # Verifica se há palavras para análise
        if not all_words:
            return jsonify({'message': 'Nenhuma descrição válida foi processada'}), 400

        # Calcula a frequência de palavras, bigramas e trigramas
        word_frequencies, bigram_frequencies, trigram_frequencies = calculate_ngram_frequencies(all_words)

        # Formata bigramas e trigramas como strings para a resposta JSON
        bigram_frequencies = { ' '.join(bigram): count for bigram, count in bigram_frequencies.items() }
        trigram_frequencies = { ' '.join(trigram): count for trigram, count in trigram_frequencies.items() }

        # Retorna as frequências das palavras, bigramas e trigramas
        return jsonify({
            'message': 'Frequência de palavras, bigramas e trigramas calculada com sucesso!',
            'word_frequencies': word_frequencies,
            'bigram_frequencies': bigram_frequencies,
            'trigram_frequencies': trigram_frequencies
        })
    except Exception as e:
        # Log do erro para ajudar na depuração
        print(f"Erro ao processar a requisição: {e}")
        return jsonify({'error': 'Erro interno no servidor', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)

