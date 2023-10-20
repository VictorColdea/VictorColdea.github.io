'''The aim of this code is to create a nice-looking mental maths tester.'''
import random

Title = "  Cambridge Mental Maths Test (v1.0) "
asterisks = "✵"*len(Title)
Starting_Message = f"""  {asterisks}\n  {Title}\n  {asterisks}\n
Hi there! So glad you decided to try out my program!
I've created a mental maths tester, to test your on-the-go arithmetic skills. [insert OoOOooOhhHH from the audience here]
It can do addition, subtraction, multiplication, and division - chosen randomly by the program.
The equation you need to solve will be print, and you can input your answer below the line.
Have fun and best of luck! It's made to be tricky ;)
                                                        - Victor Coldea (vic21)"""

def addition():#Code for addition
    num1 = random.randint(150,9000)
    num2 = random.randint(150,9000)#150-9000 is a good range for add/sub

    result = num1+num2
    output = [(num1, "+", num2), result]
    return output
def subtraction():#Code for subtraction
    num1 = random.randint(150,9000)
    num2 = random.randint(150,9000)#150-9000 is a good range for add/sub

    result = num1-num2
    output = [(num1, "-", num2), result]
    return output
def multiplication():#Code for multiplication
    num1 = random.randint(-20,20)
    num2 = random.randint(-20,20)

    result = num1*num2
    output = [(num1, "×", num2), result]
    return output
def division():
    #Division is tricky for just using random numbers, because we need to make sure they are integers for the purposes of this calculator.
    #Thus, multiplication of two numbers first and then displaying the division needed is a good way to guarantee a "nice" answer.
    num1 = random.randint(-20,20)
    num2 = random.randint(-20,20)
    product = num1*num2

    result = num2
    output = [(product, "÷", num1), result]
    return output

def create_printable_operation(maths_operation, Q_num):
    op = maths_operation[0] #don't need the "result"

    #For alignment we need to add some spaces
    num_spaces = len(str(op[0]))-len(str(op[2])) #Difference in length between num1 & num2
    spaces = " " * abs(num_spaces)

    #Aligning numbers in the sum
    if num_spaces>0: 
        printing_part = f'{Q_num}. {op[0]} {op[1]}\n   \x1B[4m{spaces}{op[2]}\x1B[0m' #This gross thing is for underlining
    else:
        printing_part = f'{Q_num}. {spaces}{op[0]} {op[1]}\n   \x1B[4m{op[2]}\x1B[0m'

    return printing_part#, num_answer_spaces

def create_equation(Q_num):
    operations = {'+':addition, '-':subtraction, '*':multiplication, "/":division}
    selected_operator = random.choice(list(operations.keys())) #Chooses a random operation of the four

    #Carrying out the chosen operation:
    maths_operation = operations[selected_operator]()
    #maths_operation[0] is the numbers and operation symbol, and maths_operation[1] is the result
    #e.g. maths_operation = [(3358, '+', 2637), 5995]
    
    printing_part = create_printable_operation(maths_operation, Q_num)

    operations_strings = {'+':"addition", '-':"subtraction", '*':"multiplication", "/":"division"} #Useful for printing at the end!

    return printing_part, maths_operation[1], operations_strings[selected_operator]
    #Returns operation in a printable format, the result, and the type of operation carried out.


def answering(equation):
    no_error = False
    #To make sure user inputs a valid guess
    while not no_error: 
        try:
            print(equation[0])
            user_ans = int(input("   "))
            no_error = True
        except ValueError:
            print("Make sure you input an integer!")
            no_error = False #The "no_error" Boolean keeps repeatedly asking the question until the user inputs a valid answer

    #Checking against previously calculated result
    if user_ans != equation[1]: #If answer is wrong
        print(f"\nOh no! You got it wrong :( \nThe correct answer was {equation[1]}, you need to brush up on your {equation[2]}!")
    else:
        print(f"\nCorrect, well done! You really know your stuff!")

    #Seeing if the user would like to continue
    response = input("Would you like another? (Y/N): ")
    if response[0].upper() == "Y": #Checks the first letter of the input - just to be extra general
        print("\nAlrighty let's get going!")
        continuing = True
    elif response[0].upper() == "N":
        print("\nRip, giving up so soon...well I'm sure you'll come back to keep your mental maths sharp so I guess I'll see you then :)")
        continuing = False 
    else:
        print("\n~You so stupid, you can't follow a simple task omg [insert facepalm here] \n~Stay away you silly billy\n")
        continuing = False

    return continuing #If the user wishes to continue
    

#Now...time for the actual source code
print(Starting_Message)
continuing = True
Q_num = 1
while continuing:
    equation = create_equation(Q_num)
    continuing = answering(equation)
    if continuing:
        Q_num+=1

if Q_num > 1:
    print("Valiant effort, thank you for giving this program a chance!")

###UPDATES TO ADD:
'''
1. Add scoring system, with percentage correct and num. attempts (easy to add but I can't be bothered)
1.1. Following on from that, and more convoluted, add a highscores table in a .txt file or something.
2. Add inputs for the kind of values to have as the limits for all the operation functions (i.e. something like Hard or Easy difficulties)
3. The most convoluted of them all, add other operations/functions such as...logarithms, modulus {using %}-(remainders not |absolute|), or trig .etc
3.1. A mega massive upgrade from here could be to make it into an integral calculator or something (would likely have to employ SymPy for that)
...and more
'''