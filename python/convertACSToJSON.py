import pandas as pd
import json


def convert_csv_to_json_by_zip(sourceFile, targetFile, columnKeys=None, yourVarName=None):
	#read source data and filter to columns if given
	dataDf = pd.read_csv(sourceFile, header=[0], skiprows=[1])
	if columnKeys:
		dataDf = dataDf[columnKeys]

	#generate a dictionary structure to map to json format
	#use first column from input file (from columnKeys) as the key and everything else in another dictionary beneath that
	#  where key=column_name, value=cell_val
	jsonDict = {}
	for rowIdx, rowData in dataDf.iterrows():
		zipId = rowData[columnKeys[0]]
		jsonDict[zipId] = dict(zip(columnKeys[1:],rowData[1:]))  #oh this is snazzy! it creates the dict under each zip in 1 line

	#write to a json file. 
	with open(fileDir+outFileName, 'w') as outFile:
		if yourVarName:
			outFile.write('var '+yourVarName+'=\n')
		json.dump(jsonDict, outFile)
	
	#get the descriptions for each file (assuming ACS data where row 1 is like the SQL column name and row 2 is like a description or english name)
	headerDf = pd.read_csv(sourceFile, header=[0], nrows=1)
	if columnKeys:
		headerDf = headerDf[columnKeys]
	headerDict = dict(zip(headerDf.columns, headerDf.iloc[0].values))
	
	print(headerDict)
	
	return jsonDict, headerDict


if __name__ == "__main__":

	#example: file has percentage of population in differetn bands of income (like a histogram of population binned by income levels)
	inputFile = '../data/info_by_zipcode/ACS_14_5YR_S1901_with_ann.csv'
	outputFile = '../data/info_by_zipcode/test.json'
	myVarName = 'zipIncomeVals'
	columnKeys = ['GEO.id2','HC01_EST_VC01','HC01_EST_VC02','HC01_EST_VC03','HC01_EST_VC04','HC01_EST_VC05','HC01_EST_VC06','HC01_EST_VC07','HC01_EST_VC08','HC01_EST_VC09','HC01_EST_VC10','HC01_EST_VC11','HC01_EST_VC13','HC01_EST_VC15','HC01_EST_VC18']
	
	convert_csv_to_json_by_zip(inputFile, outputFile, columnKeys, myVarName)
	print('done')