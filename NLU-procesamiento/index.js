const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
const aws = require('aws-sdk');
const { uid } = require('uid');

const apiKey = process.env.API_KEY;
const url = process.env.API_URL;


const dynamoDB = new aws.DynamoDB.DocumentClient();

const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
    version: '2020-08-01',
    authenticator: new IamAuthenticator({
        apikey: apiKey,
    }),
    serviceUrl: url,
});


const writeDataToDynamo = async (datos_paciente, historial_clinico, result) => {
    params = {
        TableName: process.env.tableName,
        Item: { pk: datos_paciente.curp, sk: `#ID#${uid(16)}`, datos_paciente, historial_clinico, resultado_NLU: result },
        ConditionExpression: `attribute_not_exists(SK)`
    }
    return dynamoDB.put(params).promise()
}



exports.handler = async (event, context, callback) => {
    const { datos_paciente, historial_clinico } = event;

    try {
        const analyzeParams = {
            'text': historial_clinico,
            'features': {
                'keywords': {
                    'sentiment': true,
                    'emotion': true,
                    'limit': 5
                },
                'entities': {
                    'sentiment': true,
                    'mentions': true,
                    'emotion': true,
                    'limit': 5,
                }
            }
        };


        const analysisResults = await naturalLanguageUnderstanding.analyze(analyzeParams);
        const resultObj = analysisResults.result;
        const keywords = {};
        const entities = {};

        resultObj.keywords.forEach(el => {
            keywords[el.text] = {
                "sentimiento": el.sentiment.label,

                "relevancia": el.relevance,

                "repeticiones": el.count,

                "emocion": el.emotion,
            }
        });

        resultObj.entities.forEach(el => {
            entities[el.text] = {
                tipo: el.type,
                sentimiento: el.sentiment.label,
                relevancia: el.relevance,
                emocion: el.emotion,
                repeticiones: el.count,
                porcentaje_confianza: el.confidence
            }
        })
        const res = {
            lenguaje_texto: resultObj.language,
            palabras_clave: resultObj.keywords.map(el => el.text),
            entidades: resultObj.entities.map(el => el.text),
            palabras_clave_desc: keywords,
            entidades_desc: entities,
        }

        await writeDataToDynamo(datos_paciente, historial_clinico, res);
        return res;
    } catch (err) {
        throw new Error("[ERROR] No se pudo hacer procesamiento con la NLU");
    }

};
