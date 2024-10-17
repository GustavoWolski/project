from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import string
import unicodedata
from langdetect import detect, DetectorFactory, LangDetectException
from googletrans import Translator
import spacy
from transformers import pipeline
from collections import Counter  # Certifique-se de que esta linha está presente

# Configuração do Flask
app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas


# Inicializar o tradutor e spaCy
translator = Translator()
nlp = spacy.load('pt_core_news_sm')

# Inicializar o pipeline de NER com um modelo de transformers ajustado para NER
ner_pipeline = pipeline("ner", model="Davlan/bert-base-multilingual-cased-ner-hrl", aggregation_strategy="simple")

# Definir semente para resultados consistentes na detecção de idioma
DetectorFactory.seed = 0

# Função para limpar e preparar o texto
def clean_text(text):
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
    text = emoji_pattern.sub(' ', text.lower())

    # Remove acentos
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')

    # Remove pontuações e caracteres específicos
    text = re.sub(f'[{re.escape(string.punctuation)}]', ' ', text)

    # Remove palavras com números, caracteres especiais e quebras de linha
    text = re.sub(r'\w*\d\w*|[\n·‘’“”…]', ' ', text)

    # Substitui espaços múltiplos por um único espaço
    cleaned_text = re.sub(r'\s+', ' ', text).strip()

    return cleaned_text

# Função para detectar e traduzir o texto para o português
def translate_to_portuguese(text):
    if not text or not isinstance(text, str) or not text.strip():  # Verifica se o texto é None, não é string ou está vazio
        return None
    try:
        detected_language = detect(text)
        if detected_language != 'pt':
            translation = translator.translate(text, dest='pt')
            translated_text = translation.text
            # Verifica se a tradução foi para o português
            if detect(translated_text) == 'pt':
                return translated_text
            else:
                print(f"Texto não traduzido corretamente: {translated_text}")
                return None  # Exclui texto se não estiver em português
        return text
    except (LangDetectException, Exception) as e:
        print(f"Erro ao detectar/traduzir o idioma: {e}")
        return None  # Exclui texto se houver erro na detecção ou tradução

# Função para extrair competências usando o modelo de NER baseado em transformers
def extract_competencies_with_transformer(text):
    if not text:
        return []
    results = ner_pipeline(text)
    competencies = [result['word'] for result in results if result['entity_group'] in {'SKILL', 'TOOL', 'COMPETENCY'}]
    return competencies

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        descriptions = data.get('descriptions', [])
        if not descriptions:
            return jsonify({'error': 'No descriptions provided'}), 400

        # Extrair competências de cada descrição
        all_competencies = []
        for description in descriptions:
            translated_text = translate_to_portuguese(description)
            if translated_text:
                cleaned_text = clean_text(translated_text)
                competencies = extract_competencies_with_transformer(cleaned_text)
                all_competencies.extend(competencies)

        # Contabiliza as competências extraídas
        competency_counts = Counter(all_competencies)

        # Retorna as competências extraídas
        return jsonify({
            'message': 'Competências extraídas com sucesso!',
            'competencies': competency_counts
        })
    except Exception as e:
        # Log do erro para ajudar na depuração
        print(f"Erro ao processar a requisição: {e}")
        return jsonify({'error': 'Erro interno no servidor', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)
