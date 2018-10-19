import numpy as np
import matplotlib.pyplot as plt
import fiona

#with fiona.open('cb_2015_us_zcta510_500k.shp', 'r') as src:
with fiona.open("C:\Python34\m\WI_County\cb_2015_55_cousub_500k.shp", 'r') as src:
	fig = plt.figure()
	ax = fig.add_subplot(111)
#	print(f['geometry'])
#	print('Type: ', f['type'])
#	print('ID: ', f['id'])
#	
#	for wut in f:
#		print(wut)
	cnt=0
	for feature in src:	
		for poly in feature['geometry']['coordinates']:
			coords = np.array(poly).squeeze()
			#coords=coords[coords[:,0]<0]
			cnt=cnt+1
			#print(feature['id'], coords.shape, feature['properties']['ZCTA5CE10'], feature['geometry']['type'])
			if (len(coords.shape) != 2):
				coords=np.array(coords[0])
				print('      - ',coords[0].shape)
				#continue
			
		
			#if int(feature['id'])==100:
			ax.plot(coords[:,0], coords[:,1])
		
		if cnt>2500:
			break
		
	#	print(feature['properties']['STATEFP'], ' - ', feature['properties']['NAME'], '\t\t\t', (minLng+maxLng)/2, (minLat+maxLat)/2)
		#ax.text((minLat+maxLat)/2, (minLng+maxLng)/2, feature['properties']['NAME'], fontsize=4)
		#ax.text((minLng+maxLng)/2, (minLat+maxLat)/2, feature['properties']['NAME'], fontsize=18)
	
	plt.show()