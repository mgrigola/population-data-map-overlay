import csv
#import collections

# fileMeta = fileBase + '_metadata.csv'
#fileData = fileBase + '_with_ann.csv'
 #collections.defaultdict(lambda: '?')
#dataList = []

# with open(fileMeta,'r') as meta:
	# colNo=0
	# for ln in meta:
		# lnTxt = ln.strip().split(',')
		# metaDict[lnTxt[0]]=[colNo, lnTxt[1].replace('"', '').replace(';',' -')]
		# colNo += 1

		


def readDataACS(file, columnKeys, idColumnNo, idDict = ''):
	dataDict = {}
	with open(file,'r') as fileData:
		csvData = csv.reader(fileData, delimiter=',', quotechar='"')
		firstLn = next(csvData) 
		secondLn = next(csvData)
		
		metaDict = {}
		for idx in range(len(firstLn)):
			metaDict[firstLn[idx]] = [idx, secondLn[idx].replace(';',' -')]
		
		for lnTxt in csvData:
			featureDict = {}
			colID = lnTxt[idColumnNo]
			if isinstance(idDict,dict):
				if colID in idDict:
					colID=idDict[colID]
				else:
					continue
			
			for colKey in columnKeys:
				colNo = metaDict[colKey][0]
				colName = metaDict[colKey][1]
				featureDict[colName] = lnTxt[colNo]
		
			dataDict[colID] = featureDict
	return dataDict


if __name__ == "__main__":
	file = 'C:\\leaflet\\data\\values\\ACS_14_5YR_S1901_with_ann.csv'
	columnKeys = ['HC01_EST_VC01','HC01_EST_VC02','HC01_EST_VC03','HC01_EST_VC04','HC01_EST_VC05','HC01_EST_VC06','HC01_EST_VC07','HC01_EST_VC08','HC01_EST_VC09','HC01_EST_VC10','HC01_EST_VC11','HC01_EST_VC13','HC01_EST_VC15','HC01_EST_VC18']

	dataDict = readDataACS(file, columnKeys, 1)

	
'''
import csv
#import collections

fileBase = 'C:\\leaflet\\data\\values\\ACS_14_5YR_S1901'
# fileMeta = fileBase + '_metadata.csv'
fileData = fileBase + '_with_ann.csv'
metaDict = {} #collections.defaultdict(lambda: '?')
#dataList = []
dataDict = {}
# with open(fileMeta,'r') as meta:
	# colNo=0
	# for ln in meta:
		# lnTxt = ln.strip().split(',')
		# metaDict[lnTxt[0]]=[colNo, lnTxt[1].replace('"', '').replace(';',' -')]
		# colNo += 1

		

idColumn = 1		
columnKeys = ['HC01_EST_VC01','HC01_EST_VC02','HC01_EST_VC03','HC01_EST_VC04','HC01_EST_VC05','HC01_EST_VC06','HC01_EST_VC07','HC01_EST_VC08','HC01_EST_VC09','HC01_EST_VC10','HC01_EST_VC11','HC01_EST_VC13','HC01_EST_VC15','HC01_EST_VC18']

with open(fileData,'r') as file:
	csvData = csv.reader(file, delimiter=',', quotechar='"')
	
	firstLn = next(csvData) 
	secondLn = next(csvData)
	
	for idx in range(len(firstLn)):
		metaDict[firstLn[idx]] = [idx, secondLn[idx].replace(';',' -')]
	
	for lnTxt in csvData:
		colID = lnTxt[idColumn]
		featureDict = {}
	
		
		for colKey in columnKeys:
			colNo = metaDict[colKey][0]
			colName = metaDict[colKey][1]
			featureDict[colName] = lnTxt[colNo]
		
		#dictionary of areas with key = areaID (like zip/state#)
		dataDict[colID] = featureDict

		#list of features with feature['id'] = areaID 
		#featureDict['id'] = colID
		#dataList.append(featureDict)

'''