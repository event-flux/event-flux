import MainSection from "../components/MainSection";
import { withEventFlux } from "react-event-flux";

export default withEventFlux(["todoStore", ["todos", "filter"]])(MainSection);
