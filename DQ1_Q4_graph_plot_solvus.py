import matplotlib.pyplot as plt
import numpy as np

#x = np.array([0.0001,0.1,0.3,0.5,0.7,0.9,0.9999])
x = np.linspace(0.0001,0.9999,5001)#gives smoother graph
#temps = np.array([1550,1300,1000])
temps = np.linspace(1000,1550,5001)#bigger variety of temps
temps1 = temps + 273 #converting to kelvin

h_mix = x*(1-x)*28300
s_mix = -8.31*(x*np.log(x)+(1-x)*np.log(1-x))

#Calculating and plotting G_mix 
solvus_boundaries = []
solvus_temps = []
for i in range(len(temps1)):
    g_mix = h_mix - temps1[i]*s_mix
#    plt.plot(x,g_mix, label = str(temps[i])+"°C")

    double = False #testing to see how many minima there are
    solvus_peak = False #set the peak to have not been found
    for t in range(len(g_mix)-2):
        if g_mix[t+1]<g_mix[t] and g_mix[t+2]>g_mix[t+1]:

            solvus_peak = True #if there is a double then this will be made False
            if double:#i.e. if second minima for same temp
##                print(temps[i])
                solvus_peak = False
                
                
            solvus_boundaries.append(x[t+1])
            solvus_temps.append(temps[i])
            double = True
    if solvus_peak == True: #if reached top of solvus, then stop finding the minima because they'll all be at x=0.5
        print("Max temp with 2 phases in °C = "+str(temps[i]))
        break
            
      
'''
I want to plot solvus boundaries (x axis) with temps (y axis)
''


#plt.legend(loc="lower left")
plt.xlabel("X(SnO2)")
plt.xlim(0,1)
plt.ylabel("ΔG/J mol^-1")
plt.title("ΔG as a function of composition")
plt.grid()
plt.show()

##we gotta find some minima!!!
'''
plt.plot(solvus_boundaries,solvus_temps,'.')
plt.ylabel("Temp/°C")
plt.xlabel("X(SnO2)")
plt.ylim(1000,1550)
plt.title("Solvus for 1000°C < T < 1550°C")
plt.savefig("Solvus.svg")
plt.show()
